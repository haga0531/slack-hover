variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "asia-northeast1"
}

variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "stm-backend"
}

variable "container_image" {
  description = "Container image URL for Cloud Run"
  type        = string
}

variable "gemini_model" {
  description = "Gemini model name"
  type        = string
  default     = "gemini-2.5-flash"
}

variable "github_repo" {
  description = "GitHub repository (owner/repo format)"
  type        = string
  default     = "haga0531/slack-hover"
}
