-- Extends the row-level-security lockdown from the earlier migration to the
-- two Governance Copilot history tables added just now — same reasoning:
-- this app only ever reads/writes via FastAPI's direct Postgres connection
-- (BYPASSRLS role), so this just closes them off from Supabase's PostgREST.

ALTER TABLE "governance_copilot_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "governance_copilot_messages" ENABLE ROW LEVEL SECURITY;
