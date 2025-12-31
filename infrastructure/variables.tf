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

variable "slack_client_id" {
  description = "Slack OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "slack_client_secret" {
  description = "Slack OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "slack_signing_secret" {
  description = "Slack Signing Secret"
  type        = string
  sensitive   = true
}

variable "slack_state_secret" {
  description = "Slack OAuth State Secret"
  type        = string
  sensitive   = true
}

variable "gemini_model" {
  description = "Gemini model name"
  type        = string
  default     = "gemini-2.5-flash"
}
