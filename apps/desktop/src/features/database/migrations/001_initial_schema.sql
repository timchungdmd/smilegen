CREATE TABLE cases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  workflow_state TEXT NOT NULL,
  presentation_ready INTEGER NOT NULL DEFAULT 0,
  export_blocked INTEGER NOT NULL DEFAULT 0,
  active_design_version_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  type TEXT NOT NULL,
  local_path TEXT NOT NULL,
  FOREIGN KEY (case_id) REFERENCES cases(id)
);
