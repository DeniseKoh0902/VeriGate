-- Extends the row-level-security lockdown from the earlier migrations to the
-- new usage-scan table — same reasoning: this app only ever reads/writes via
-- FastAPI's direct Postgres connection (BYPASSRLS role), so this just closes
-- it off from Supabase's PostgREST.

ALTER TABLE "ai_tool_usage_scans" ENABLE ROW LEVEL SECURITY;
