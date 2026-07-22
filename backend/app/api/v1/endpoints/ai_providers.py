from fastapi import APIRouter, Depends

from app.core.dependencies import require_roles
from app.schemas.ai_provider import AiProviderConfigure, AiProviderOut
from app.schemas.user import UserOut
from app.services import ai_provider_service

router = APIRouter(
    prefix="/ai-providers",
    tags=["ai-providers"],
    dependencies=[Depends(require_roles("ADMIN"))],
)

_require_admin = require_roles("ADMIN")


@router.get("", response_model=list[AiProviderOut])
async def get_ai_providers() -> list[AiProviderOut]:
    return await ai_provider_service.list_providers()


@router.post("", response_model=AiProviderOut)
async def configure_ai_provider(
    payload: AiProviderConfigure, current_user: UserOut = Depends(_require_admin)
) -> AiProviderOut:
    return await ai_provider_service.configure_provider(payload, current_user.id)
