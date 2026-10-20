CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash TEXT NOT NULL, profile TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE saves (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), revision INTEGER NOT NULL, kind TEXT NOT NULL, room_name TEXT NOT NULL, saved_at TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(user_id,revision));
CREATE INDEX saves_owner_revision ON saves(user_id,revision DESC);
CREATE TABLE attempts (bucket TEXT PRIMARY KEY, n INTEGER NOT NULL, reset_at INTEGER NOT NULL);
