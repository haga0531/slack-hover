resource "google_cloud_run_v2_service" "backend" {
  name     = var.service_name
  location = var.region

  template {
    containers {
      image = var.container_image

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "PORT"
        value = "8080"
      }

      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "GCP_REGION"
        value = var.region
      }

      env {
        name  = "GEMINI_MODEL"
        value = var.gemini_model
      }

      env {
        name  = "SLACK_CLIENT_ID"
        value = var.slack_client_id
      }

      env {
        name  = "SLACK_CLIENT_SECRET"
        value = var.slack_client_secret
      }

      env {
        name  = "SLACK_SIGNING_SECRET"
        value = var.slack_signing_secret
      }

      env {
        name  = "SLACK_STATE_SECRET"
        value = var.slack_state_secret
      }

      env {
        name  = "MAX_THREAD_MESSAGES"
        value = "100"
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }

  depends_on = [google_project_service.run]
}
