from fastapi import APIRouter, Depends, status

from app.core.dependencies import require_roles
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services import user_service

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(require_roles("ADMIN"))],
)

_require_admin = require_roles("ADMIN")


@router.get("", response_model=list[UserOut])
async def get_users() -> list[UserOut]:
    return await user_service.list_users()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate, current_user: UserOut = Depends(_require_admin)
) -> UserOut:
    return await user_service.create_user(payload, current_user.id)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str, payload: UserUpdate, current_user: UserOut = Depends(_require_admin)
) -> UserOut:
    return await user_service.update_user(user_id, payload, current_user.id)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str, current_user: UserOut = Depends(_require_admin)
) -> None:
    await user_service.delete_user(user_id, current_user.id)
