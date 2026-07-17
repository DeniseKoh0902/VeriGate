from fastapi import APIRouter

from app.api.v1.endpoints import ai_tool_requests, auth, governance_copilot, policies, prompts, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(policies.router)
api_router.include_router(ai_tool_requests.router)
api_router.include_router(users.router)
api_router.include_router(prompts.router)
api_router.include_router(governance_copilot.router)
