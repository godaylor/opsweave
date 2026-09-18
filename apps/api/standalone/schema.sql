-- Original private OpsWeave schema. Additive only; never modifies public or other apps.
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,created BIGINT NOT NULL,disabled INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS records(seq BIGSERIAL UNIQUE,id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,body JSONB NOT NULL);
CREATE INDEX IF NOT EXISTS records_owner_kind ON records(owner,kind,seq DESC);
CREATE INDEX IF NOT EXISTS records_pending ON records(((body->>'updated')::bigint)) WHERE kind='run' AND body->>'status' IN ('running','waiting');
CREATE TABLE IF NOT EXISTS events(seq BIGSERIAL PRIMARY KEY,owner TEXT NOT NULL REFERENCES users(id),run_id TEXT NOT NULL,body JSONB NOT NULL);
CREATE INDEX IF NOT EXISTS events_owner_run ON events(owner,run_id,seq);
CREATE TABLE IF NOT EXISTS acceptance(owner TEXT NOT NULL REFERENCES users(id),key TEXT NOT NULL,digest TEXT NOT NULL,run_id TEXT NOT NULL,PRIMARY KEY(owner,key));
CREATE TABLE IF NOT EXISTS api_keys(hash TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES users(id),expires BIGINT NOT NULL,last_four TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
CREATE INDEX IF NOT EXISTS api_keys_owner ON api_keys(owner);
DO $$ DECLARE tab TEXT; BEGIN
 EXECUTE format('REVOKE ALL ON SCHEMA %I FROM PUBLIC', current_schema());
 EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM PUBLIC', current_schema());
 EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA %I FROM PUBLIC', current_schema());
 FOREACH tab IN ARRAY ARRAY['users','sessions','records','events','acceptance','api_keys'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tab);
 END LOOP;
END $$;
