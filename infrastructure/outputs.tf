output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.backend.uri
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

# GitHub Actions WIF outputs - use these values for GitHub secrets
output "wif_provider" {
  description = "Workload Identity Provider (set as WIF_PROVIDER secret in GitHub)"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "wif_service_account" {
  description = "Service Account email (set as WIF_SERVICE_ACCOUNT secret in GitHub)"
  value       = google_service_account.github_actions.email
}
