# CareSignal infrastructure

This module provisions separate staging/production Cloud Run services, Artifact Registry,
Secret Manager bindings, logging and the 99.9% availability SLO in `asia-southeast1`.
Images must be supplied by immutable digest. Secret values are added outside Terraform.

Supabase, Timescale Cloud, CloudAMQP and Vercel remain managed vendor resources. Their
project IDs, regions, network restrictions, PITR and log-drain evidence belong in the
go-live evidence pack; Terraform must not contain PHI or secret values.

Production live dispatch is invalid unless `phi_processing_approved=true`; this is also
enforced by both application runtimes.
