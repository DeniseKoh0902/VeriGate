import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # Not a valid bcrypt hash (e.g. a placeholder account) — never a match.
        return False


def create_access_token(subject: str, extra_claims: dict | None = None) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "exp": expire, **(extra_claims or {})}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as error:
        raise ValueError("Invalid or expired token.") from error


def password_fingerprint(password_hash: str) -> str:
    """A short digest of the current password hash, embedded in a reset
    token so the token stops working the instant the password actually
    changes — single-use, without needing a database table to track it."""
    return hashlib.sha256(password_hash.encode("utf-8")).hexdigest()[:16]


def create_password_reset_token(user_id: str, password_hash: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.password_reset_token_expire_minutes
    )
    payload = {
        "sub": user_id,
        "exp": expire,
        "purpose": "password_reset",
        "pwd": password_fingerprint(password_hash),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_password_reset_token(token: str) -> dict:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as error:
        raise ValueError("This reset link is invalid or has expired.") from error
    if payload.get("purpose") != "password_reset":
        raise ValueError("This reset link is invalid.")
    return payload
