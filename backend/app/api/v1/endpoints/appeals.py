from fastapi import APIRouter, status

from app.schemas.appeal import (
    AppealAdminOut,
    AppealCreate,
    AppealOut,
    AppealRequestInfoRequest,
    AppealResolveRequest,
    AppealRespondRequest,
)
from app.services import appeal_service

router = APIRouter(prefix="/appeals", tags=["appeals"])


# Static "/mine" is registered ahead of any future "/{appeal_id}" routes so a
# dynamic id segment can never shadow it.
@router.get("/mine", response_model=list[AppealOut])
async def get_my_appeals() -> list[AppealOut]:
    return await appeal_service.list_my_appeals()


@router.get("", response_model=list[AppealAdminOut])
async def get_all_appeals() -> list[AppealAdminOut]:
    return await appeal_service.list_all_appeals()


@router.post("", response_model=AppealOut, status_code=status.HTTP_201_CREATED)
async def create_appeal(payload: AppealCreate) -> AppealOut:
    return await appeal_service.create_appeal(payload)


@router.patch("/{appeal_id}/resolve", response_model=AppealAdminOut)
async def resolve_appeal(appeal_id: str, payload: AppealResolveRequest) -> AppealAdminOut:
    return await appeal_service.resolve_appeal(appeal_id, payload)


@router.patch("/{appeal_id}/request-info", response_model=AppealAdminOut)
async def request_more_info(appeal_id: str, payload: AppealRequestInfoRequest) -> AppealAdminOut:
    return await appeal_service.request_more_info(appeal_id, payload)


@router.patch("/{appeal_id}/respond", response_model=AppealOut)
async def respond_to_info_request(appeal_id: str, payload: AppealRespondRequest) -> AppealOut:
    return await appeal_service.respond_to_info_request(appeal_id, payload)
