from fastapi import APIRouter

from app.api.v1.endpoints import (
    ai_providers,
    ai_tool_requests,
    appeals,
    ai_tools,
    audit_logs,
    auth,
    compliance,
    contact,
    dashboard,
    employee_policies,
    governance_copilot,
    notifications,
    policies,
    policy_recommendations,
    prompts,
    risk_alerts,
    users,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(policies.router)
api_router.include_router(employee_policies.router)
api_router.include_router(policy_recommendations.router)
api_router.include_router(ai_tool_requests.router)
api_router.include_router(users.router)
api_router.include_router(prompts.router)
api_router.include_router(governance_copilot.router)
api_router.include_router(ai_tools.router)
api_router.include_router(ai_providers.router)
api_router.include_router(appeals.router)
api_router.include_router(compliance.router)
api_router.include_router(risk_alerts.router)
api_router.include_router(audit_logs.router)
api_router.include_router(contact.router)
api_router.include_router(notifications.router)
