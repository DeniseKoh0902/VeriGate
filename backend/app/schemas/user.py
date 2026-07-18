from typing import Literal

from pydantic import BaseModel, EmailStr

from app.schemas.common import UtcDatetime
from app.schemas.password import PasswordStr

Role = Literal["ADMIN", "COMPLIANCE", "EMPLOYEE"]


class UserCreate(BaseModel):
    email: EmailStr
    password: PasswordStr
    name: str
    department: str
    role: Role = "EMPLOYEE"


class UserUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    role: Role | None = None
    isActive: bool | None = None


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    department: str
    role: Role
    isActive: bool
    createdAt: UtcDatetime
