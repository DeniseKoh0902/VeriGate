from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.schemas.prompt import ChatSessionOut, PromptHistoryItem, PromptSubmitRequest, PromptSubmitResponse
from app.schemas.user import UserOut
from app.services import prompt_service

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.post("", response_model=PromptSubmitResponse)
async def submit_prompt(
    payload: PromptSubmitRequest, current_user: UserOut = Depends(get_current_user)
) -> PromptSubmitResponse:
    return await prompt_service.submit_prompt(payload, current_user.id)


# Static "/sessions" is registered ahead of the dynamic "/sessions/{session_id}"
# path below it, so a session id can never shadow it.
@router.get("/sessions", response_model=list[ChatSessionOut])
async def get_chat_sessions(
    current_user: UserOut = Depends(get_current_user),
) -> list[ChatSessionOut]:
    return await prompt_service.list_chat_sessions(current_user.id)


@router.get("/sessions/{session_id}", response_model=list[PromptHistoryItem])
async def get_chat_session_messages(
    session_id: str, current_user: UserOut = Depends(get_current_user)
) -> list[PromptHistoryItem]:
    return await prompt_service.get_session_messages(session_id, current_user.id)
