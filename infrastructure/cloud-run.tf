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
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      env {
        name = "SLACK_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = "slack-client-id"
            version = "latest"
          }
        }
      }

      env {
        name = "SLACK_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = "slack-client-secret"
            version = "latest"
          }
        }
      }

      env {
        name = "SLACK_SIGNING_SECRET"
        value_source {
          secret_key_ref {
            secret  = "slack-signing-secret"
            version = "latest"
          }
        }
      }

      env {
        name = "SLACK_STATE_SECRET"
        value_source {
          secret_key_ref {
            secret  = "slack-state-secret"
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }

  depends_on = [google_project_service.run]
}
