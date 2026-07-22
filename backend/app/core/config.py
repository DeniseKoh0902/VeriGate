from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "VeriGate API"
    environment: str = "development"

    database_url: str
    direct_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    cors_origins: list[str] = ["http://localhost:5173"]
    frontend_url: str = "http://localhost:5173"

    gemini_api_key: str

    # Fernet key (Fernet.generate_key()) encrypting AiProvider.encryptedApiKey
    # at rest — deliberately never stored anywhere near the ciphertext it
    # protects (i.e. not in the database).
    provider_key_encryption_secret: str

    email_host: str
    email_port: int = 587
    sender_email: str
    sender_email_pw: str
    password_reset_token_expire_minutes: int = 30


@lru_cache
def get_settings() -> Settings:
    return Settings()
