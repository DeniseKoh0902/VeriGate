from fastapi import APIRouter, status

from app.schemas.appeal import AppealCreate, AppealOut
from app.services import appeal_service

router = APIRouter(prefix="/appeals", tags=["appeals"])


# Static "/mine" is registered ahead of any future "/{appeal_id}" routes so a
# dynamic id segment can never shadow it.
@router.get("/mine", response_model=list[AppealOut])
async def get_my_appeals() -> list[AppealOut]:
    return await appeal_service.list_my_appeals()


@router.post("", response_model=AppealOut, status_code=status.HTTP_201_CREATED)
async def create_appeal(payload: AppealCreate) -> AppealOut:
    return await appeal_service.create_appeal(payload)
