from fastapi import APIRouter

from app.api.v1.endpoints import auth, governance_copilot, policies

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(policies.router)
api_router.include_router(governance_copilot.router)
