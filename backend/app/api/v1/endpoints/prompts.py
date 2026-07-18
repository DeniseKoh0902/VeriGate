from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.schemas.prompt import PromptHistoryItem, PromptSubmitRequest, PromptSubmitResponse
from app.schemas.user import UserOut
from app.services import prompt_service

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.post("", response_model=PromptSubmitResponse)
async def submit_prompt(
    payload: PromptSubmitRequest, current_user: UserOut = Depends(get_current_user)
) -> PromptSubmitResponse:
    return await prompt_service.submit_prompt(payload, current_user.id)


@router.get("", response_model=list[PromptHistoryItem])
async def get_prompt_history(
    current_user: UserOut = Depends(get_current_user),
) -> list[PromptHistoryItem]:
    return await prompt_service.get_prompt_history(current_user.id)
