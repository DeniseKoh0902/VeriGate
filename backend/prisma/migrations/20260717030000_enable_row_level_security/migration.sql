-- Locks every application table down from Supabase's auto-generated REST API
-- (PostgREST). This app only ever reads/writes via FastAPI's direct Postgres
-- connection (which uses a role with BYPASSRLS), so "no policies" here means
-- "no access via the anon/publishable key", not "no access at all".

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_tools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_trust_evaluations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prompts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prompt_risk_findings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sensitive_data_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_tool_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "risk_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appeals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "policy_recommendations" ENABLE ROW LEVEL SECURITY;
