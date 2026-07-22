from fastapi import HTTPException, status

from app.core.crypto import decrypt_secret, encrypt_secret, last_four
from app.db.pool import get_pool
from app.repositories import ai_provider_repository, audit_log_repository
from app.schemas.ai_provider import AiProviderConfigure, AiProviderOut


def _to_out(row) -> AiProviderOut:
    return AiProviderOut(
        id=row["id"],
        vendor=row["vendor"],
        apiBaseUrl=row["apiBaseUrl"],
        hasApiKey=row["encryptedApiKey"] is not None,
        keyLastFour=row["keyLastFour"],
        configuredById=row["configuredById"],
        configuredAt=row["configuredAt"],
        createdAt=row["createdAt"],
        toolCount=row["toolCount"],
    )


async def list_providers() -> list[AiProviderOut]:
    pool = get_pool()
    rows = await ai_provider_repository.list_providers(pool)
    return [_to_out(row) for row in rows]


async def is_vendor_ready(vendor: str) -> bool:
    """Whether prompts can actually be forwarded for this vendor right now —
    the infra-readiness gate prompt_service checks independently of
    governance (riskTier/Tool Tier Policy already decide whether a prompt
    *should* go through; this decides whether it technically *can*)."""
    pool = get_pool()
    row = await ai_provider_repository.get_provider_by_vendor(pool, vendor)
    return row is not None and row["encryptedApiKey"] is not None


async def get_decrypted_key_for_vendor(vendor: str) -> tuple[str, str | None] | None:
    """Returns (decrypted_api_key, apiBaseUrl) for a ready vendor, or None —
    used only inside the model-dispatch path, never exposed via any
    response schema."""
    pool = get_pool()
    row = await ai_provider_repository.get_provider_by_vendor(pool, vendor)
    if row is None or row["encryptedApiKey"] is None:
        return None
    return decrypt_secret(row["encryptedApiKey"]), row["apiBaseUrl"]


async def configure_provider(payload: AiProviderConfigure, actor_id: str) -> AiProviderOut:
    pool = get_pool()
    provider = await ai_provider_repository.get_or_create_provider_by_vendor(pool, payload.vendor)

    encrypted = encrypt_secret(payload.apiKey)
    row = await ai_provider_repository.set_api_key(
        pool,
        provider["id"],
        encrypted_api_key=encrypted,
        key_last_four=last_four(payload.apiKey),
        api_base_url=payload.apiBaseUrl,
        configured_by_id=actor_id,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found.")

    await audit_log_repository.create_audit_log(
        pool,
        user_id=actor_id,
        action=f'API Key Configured: "{payload.vendor}"',
        entity_type="AiProvider",
        entity_id=row["id"],
        # Never snapshot the key itself, not even encrypted — an audit trail
        # entry doesn't need to be able to reconstruct the secret.
        snapshot=None,
    )

    return _to_out(row)
