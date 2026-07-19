-- Extends the row-level-security lockdown from the earlier migrations to the
-- new use case policy table — same reasoning: this app only ever reads/writes
-- via FastAPI's direct Postgres connection (BYPASSRLS role), so this just
-- closes it off from Supabase's PostgREST.

ALTER TABLE "use_case_policies" ENABLE ROW LEVEL SECURITY;
