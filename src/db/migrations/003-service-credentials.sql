CREATE TABLE service_credentials (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  adapter_id TEXT NOT NULL,
  encrypted_blob BLOB NOT NULL,
  iv BLOB NOT NULL,
  auth_tag BLOB NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, adapter_id)
);