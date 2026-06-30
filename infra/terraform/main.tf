locals {
  service_prefix = "caresignal-${var.environment}"
  runtime_env     = var.environment == "production" ? "production" : "staging"
}

resource "google_artifact_registry_repository" "containers" {
  location      = var.region
  repository_id = local.service_prefix
  format        = "DOCKER"
}

resource "google_service_account" "runtime" {
  account_id   = "cs-${substr(var.environment, 0, 4)}-runtime"
  display_name = "CareSignal ${var.environment} runtime"
}

resource "google_secret_manager_secret" "runtime" {
  for_each = toset([
    "OPENAI_API_KEY",
    "SUPABASE_SERVICE_KEY",
    "SUPABASE_JWKS_URL",
    "SUPABASE_DB_URL",
    "TIMESCALE_DB_URL",
    "CLOUDAMQP_URL",
  ])
  secret_id = "${local.service_prefix}-${lower(replace(each.value, "_", "-"))}"
  replication { auto {} }
}

resource "google_project_iam_member" "runtime_secret_access" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_cloud_run_v2_service" "ai" {
  name     = "${local.service_prefix}-ai"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = google_service_account.runtime.email
    scaling {
      min_instance_count = var.environment == "production" ? 1 : 0
      max_instance_count = 20
    }
    containers {
      image = var.ai_image_digest
      resources {
        limits   = { cpu = "2", memory = "2Gi" }
        cpu_idle = true
      }
      env {
        name  = "APP_ENVIRONMENT"
        value = local.runtime_env
      }
      env {
        name  = "AI_MODE"
        value = "off"
      }
      env {
        name  = "ALERT_DISPATCH_MODE"
        value = var.alert_dispatch_mode
      }
      env {
        name  = "PHI_PROCESSING_APPROVED"
        value = tostring(var.phi_processing_approved)
      }
      env {
        name  = "SUPABASE_URL"
        value = var.supabase_url
      }
      dynamic "env" {
        for_each = {
          OPENAI_API_KEY       = "OPENAI_API_KEY"
          SUPABASE_SERVICE_KEY = "SUPABASE_SERVICE_KEY"
          SUPABASE_JWKS_URL    = "SUPABASE_JWKS_URL"
          SUPABASE_DB_URL      = "SUPABASE_DB_URL"
          TIMESCALE_DB_URL     = "TIMESCALE_DB_URL"
        }
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.runtime[env.value].secret_id
              version = "latest"
            }
          }
        }
      }
      startup_probe {
        http_get { path = "/health" }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        failure_threshold     = 12
      }
      liveness_probe {
        http_get { path = "/health" }
        period_seconds = 30
        timeout_seconds = 5
      }
    }
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "google_cloud_run_v2_service" "ingestion" {
  name     = "${local.service_prefix}-ingestion"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = google_service_account.runtime.email
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
    containers {
      image = var.ingestion_image_digest
      resources {
        limits   = { cpu = "2", memory = "1Gi" }
        cpu_idle = false
      }
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.runtime["TIMESCALE_DB_URL"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "RABBITMQ_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.runtime["CLOUDAMQP_URL"].secret_id
            version = "latest"
          }
        }
      }
      startup_probe {
        http_get { path = "/health" }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        failure_threshold     = 12
      }
      liveness_probe {
        http_get { path = "/health" }
        period_seconds = 30
        timeout_seconds = 5
      }
    }
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "google_logging_project_sink" "redacted_security" {
  name        = "${local.service_prefix}-security-audit"
  destination = "logging.googleapis.com/projects/${var.project_id}/locations/global/buckets/_Default"
  filter      = "resource.type=\"cloud_run_revision\" AND NOT jsonPayload.contains_phi=true"
}

resource "google_monitoring_service" "ai" {
  service_id   = "${local.service_prefix}-ai"
  display_name = "CareSignal AI ${var.environment}"
  basic_service {
    service_type = "CLOUD_RUN"
    service_labels = {
      service_name = google_cloud_run_v2_service.ai.name
      location     = var.region
    }
  }
}

resource "google_cloud_run_v2_service_iam_member" "ai_public_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.ai.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_monitoring_slo" "availability" {
  service      = google_monitoring_service.ai.service_id
  slo_id       = "monthly-availability"
  display_name = "99.9% monthly availability"
  goal         = 0.999
  rolling_period_days = 30
  request_based_sli {
    good_total_ratio {
      good_service_filter  = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" metric.label.response_code_class!=\"5xx\""
      total_service_filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\""
    }
  }
}
