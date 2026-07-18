from pydantic import BaseModel, EmailStr

from app.schemas.password import PasswordStr
from app.schemas.user import UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    user: UserOut


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: PasswordStr


class MessageResponse(BaseModel):
    message: str
