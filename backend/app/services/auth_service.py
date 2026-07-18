import logging

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.core.email import send_email
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    hash_password,
    password_fingerprint,
    verify_password,
)
from app.db.pool import get_pool
from app.repositories import audit_log_repository
from app.repositories.user_repository import get_user_by_email, get_user_by_id, update_password
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.user import UserOut

logger = logging.getLogger(__name__)

_GENERIC_FORGOT_PASSWORD_MESSAGE = (
    "If an account exists for that email, we've sent a password reset link."
)


async def authenticate_user(payload: LoginRequest) -> TokenResponse:
    pool = get_pool()
    user = await get_user_by_email(pool, payload.email)

    if user is None or not verify_password(payload.password, user["passwordHash"]):
        # No user row to attach this to when the email itself is unknown —
        # entityId carries the attempted email instead in that case.
        await audit_log_repository.create_audit_log(
            pool,
            user_id=user["id"] if user else None,
            action="Login Failed",
            entity_type="Auth",
            entity_id=user["id"] if user else payload.email,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user["isActive"]:
        await audit_log_repository.create_audit_log(
            pool,
            user_id=user["id"],
            action="Login Blocked — Account Deactivated",
            entity_type="Auth",
            entity_id=user["id"],
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account has been deactivated. Contact IT Infrastructure.",
        )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=user["id"],
        action="Login Succeeded",
        entity_type="Auth",
        entity_id=user["id"],
    )

    access_token = create_access_token(subject=user["id"], extra_claims={"role": user["role"]})
    return TokenResponse(accessToken=access_token, user=UserOut(**dict(user)))


async def request_password_reset(payload: ForgotPasswordRequest) -> MessageResponse:
    pool = get_pool()
    user = await get_user_by_email(pool, payload.email)

    # Always return the same message whether or not the account exists —
    # otherwise this endpoint becomes a way to enumerate valid emails.
    if user is not None and user["isActive"]:
        token = create_password_reset_token(user["id"], user["passwordHash"])
        reset_url = f"{get_settings().frontend_url}/reset-password?token={token}"
        try:
            await send_email(
                to=user["email"],
                subject="Reset your VeriGate password",
                html_body=(
                    f"<p>Hi {user['name']},</p>"
                    "<p>Someone requested a password reset for your VeriGate account. "
                    f"This link expires in {get_settings().password_reset_token_expire_minutes} minutes.</p>"
                    f'<p><a href="{reset_url}">Reset your password</a></p>'
                    "<p>If you didn't request this, you can safely ignore this email.</p>"
                ),
            )
        except Exception:
            logger.error("Password reset email failed to send for user %s", user["id"])

    return MessageResponse(message=_GENERIC_FORGOT_PASSWORD_MESSAGE)


async def reset_password(payload: ResetPasswordRequest) -> MessageResponse:
    try:
        token_payload = decode_password_reset_token(payload.token)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    pool = get_pool()
    user = await get_user_by_id(pool, token_payload["sub"])
    if user is None or not user["isActive"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired.",
        )

    if token_payload.get("pwd") != password_fingerprint(user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has already been used. Request a new one.",
        )

    await update_password(pool, user["id"], hash_password(payload.newPassword))
    return MessageResponse(message="Your password has been reset. You can now sign in.")
