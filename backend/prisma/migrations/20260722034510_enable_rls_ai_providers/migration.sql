-- Extends the row-level-security lockdown from the earlier migrations to the
-- new ai_providers table — same reasoning: this app only ever reads/writes
-- via FastAPI's direct Postgres connection (BYPASSRLS role), so this just
-- closes it off from Supabase's PostgREST. Especially important here since
-- this table holds encrypted API key ciphertext.

ALTER TABLE "ai_providers" ENABLE ROW LEVEL SECURITY;
