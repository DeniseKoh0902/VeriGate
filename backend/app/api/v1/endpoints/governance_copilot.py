from fastapi import APIRouter, Depends

from app.core.dependencies import require_roles
from app.schemas.governance_copilot import GovernanceCopilotRequest, GovernanceCopilotResponse
from app.services import governance_copilot_service

router = APIRouter(
    prefix="/governance-copilot",
    tags=["governance-copilot"],
    dependencies=[Depends(require_roles("ADMIN", "COMPLIANCE"))],
)


@router.post("/chat", response_model=GovernanceCopilotResponse)
async def chat(payload: GovernanceCopilotRequest) -> GovernanceCopilotResponse:
    message = await governance_copilot_service.ask(payload)
    return GovernanceCopilotResponse(message=message)
