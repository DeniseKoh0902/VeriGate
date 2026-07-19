from fastapi import APIRouter, Depends

from app.core.dependencies import require_roles
from app.schemas.governance_copilot import (
    ChatMessageOut,
    GovernanceCopilotRequest,
    GovernanceCopilotResponse,
    GovernanceCopilotSessionOut,
)
from app.schemas.user import UserOut
from app.services import governance_copilot_service

router = APIRouter(
    prefix="/governance-copilot",
    tags=["governance-copilot"],
    dependencies=[Depends(require_roles("ADMIN"))],
)

_require_admin = require_roles("ADMIN")


@router.post("/chat", response_model=GovernanceCopilotResponse)
async def chat(
    payload: GovernanceCopilotRequest, current_user: UserOut = Depends(_require_admin)
) -> GovernanceCopilotResponse:
    return await governance_copilot_service.ask(payload, current_user.id)


# Static "/sessions" is registered ahead of the dynamic "/sessions/{session_id}"
# path below it, so a session id can never shadow it.
@router.get("/sessions", response_model=list[GovernanceCopilotSessionOut])
async def get_sessions(
    current_user: UserOut = Depends(_require_admin),
) -> list[GovernanceCopilotSessionOut]:
    return await governance_copilot_service.list_sessions(current_user.id)


@router.get("/sessions/{session_id}", response_model=list[ChatMessageOut])
async def get_session_messages(
    session_id: str, current_user: UserOut = Depends(_require_admin)
) -> list[ChatMessageOut]:
    return await governance_copilot_service.get_session_messages(session_id, current_user.id)
