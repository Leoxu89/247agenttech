CREATE TABLE wealth_history (
  owner TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (owner, snapshot_date)
);
--> statement-breakpoint
CREATE TABLE wealth_revision (
  owner TEXT PRIMARY KEY NOT NULL,
  version INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE wealth_pin_attempts (
  owner TEXT PRIMARY KEY NOT NULL,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
