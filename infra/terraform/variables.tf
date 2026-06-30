variable "project_id" {
  type = string
}

variable "environment" {
  type = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production"
  }
}

variable "region" {
  type    = string
  default = "asia-southeast1"
}

variable "ai_image_digest" {
  type = string
}

variable "ingestion_image_digest" {
  type = string
}

variable "alert_dispatch_mode" {
  type = string
  validation {
    condition     = contains(["shadow", "live"], var.alert_dispatch_mode)
    error_message = "alert_dispatch_mode must be shadow or live"
  }
}

variable "phi_processing_approved" {
  type    = bool
  default = false
}

variable "supabase_url" {
  type = string
}
