from google import genai

from app.core.config import get_settings

_client: genai.Client | None = None


def get_gemini_client() -> genai.Client:
    """Lazily creates the Gemini client on first real use, rather than at
    import time — a missing/invalid GEMINI_API_KEY then only breaks the
    feature that actually needs it, instead of crashing the whole app on
    startup (see governance_copilot_service.py's module-level client for
    the failure mode this avoids)."""
    global _client
    if _client is None:
        _client = genai.Client(api_key=get_settings().gemini_api_key)
    return _client
