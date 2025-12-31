resource "google_firestore_database" "main" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.firestore]
}

# TTL policy for summary cache - automatically deletes expired entries
resource "google_firestore_field" "summary_cache_ttl" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "summary_cache"
  field      = "expiresAt"

  ttl_config {}

  depends_on = [google_firestore_database.main]
}
