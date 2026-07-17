from fastapi import APIRouter

from app.schemas.prompt import PromptHistoryItem, PromptSubmitRequest, PromptSubmitResponse
from app.services import prompt_service

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.post("", response_model=PromptSubmitResponse)
async def submit_prompt(payload: PromptSubmitRequest) -> PromptSubmitResponse:
    return await prompt_service.submit_prompt(payload)


@router.get("", response_model=list[PromptHistoryItem])
async def get_prompt_history() -> list[PromptHistoryItem]:
    return await prompt_service.get_prompt_history()
