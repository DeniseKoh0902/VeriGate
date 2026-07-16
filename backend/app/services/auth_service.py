from fastapi import HTTPException, status

from app.db.prisma import db
from app.schemas.auth import LoginRequest, TokenResponse


async def authenticate_user(payload: LoginRequest) -> TokenResponse:
    user = await db.user.find_unique(where={"email": payload.email})

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # TODO: verify hashed password and issue a real JWT.
    return TokenResponse(access_token="placeholder-token")
