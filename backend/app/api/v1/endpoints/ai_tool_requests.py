from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_current_user
from app.schemas.ai_tool_request import AiToolRequestCreate, AiToolRequestOut
from app.schemas.user import UserOut
from app.services import ai_tool_request_service

router = APIRouter(prefix="/ai-tool-requests", tags=["ai-tool-requests"])


# Static "/mine" is registered ahead of any future "/{request_id}" routes so a
# dynamic id segment can never shadow it.
@router.get("/mine", response_model=list[AiToolRequestOut])
async def get_my_requests(current_user: UserOut = Depends(get_current_user)) -> list[AiToolRequestOut]:
    return await ai_tool_request_service.list_my_requests(current_user.id)


@router.post("", response_model=AiToolRequestOut, status_code=status.HTTP_201_CREATED)
async def create_request(
    payload: AiToolRequestCreate, current_user: UserOut = Depends(get_current_user)
) -> AiToolRequestOut:
    return await ai_tool_request_service.create_request(payload, current_user.id)
