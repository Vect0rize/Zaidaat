-- ZAIDAAT Migration 004: Security hardening, audit logs & missing query indexes

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER,
  details_json TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_logs(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_logs(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_saved_props_user ON saved_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_job ON projects(job_id);
CREATE INDEX IF NOT EXISTS idx_projects_property ON projects(property_id);
CREATE INDEX IF NOT EXISTS idx_complaints_reporter ON complaints_reports(reporter_id, target_type, target_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_engagement
  ON reviews(reviewer_id, professional_id, COALESCE(project_id, -1), COALESCE(job_id, -1));
