from fastapi import HTTPException, status

from app.db.pool import get_pool
from app.repositories.user_repository import get_user_by_email
from app.schemas.auth import LoginRequest, TokenResponse


async def authenticate_user(payload: LoginRequest) -> TokenResponse:
    pool = get_pool()
    user = await get_user_by_email(pool, payload.email)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # TODO: verify hashed password and issue a real JWT.
    return TokenResponse(access_token="placeholder-token")
