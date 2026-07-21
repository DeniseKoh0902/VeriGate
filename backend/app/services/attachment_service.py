import logging
from dataclasses import dataclass

from google.genai import errors, types

from app.core.gemini_client import get_gemini_client

logger = logging.getLogger(__name__)

_EXTRACTION_MODEL = "gemini-flash-lite-latest"

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15MB per file
# Gemini's inline (non-Files-API) request payload is capped around 20MB
# total, so this is a per-file ceiling, not a guarantee — several
# non-redacted files near the max size attached to one prompt can still add
# up past that and fail at generation time.
MAX_FILES_PER_PROMPT = 4

# Only formats Gemini can read natively (as image/document understanding) or
# that we can decode as plain text ourselves — no PDF/OCR/office-doc parsing
# libraries are added just for this, since Gemini already covers that ground.
TEXT_MIME_TYPES = {"text/plain", "text/csv", "text/markdown", "application/json"}
_NATIVE_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
}
ALLOWED_MIME_TYPES = TEXT_MIME_TYPES | _NATIVE_MIME_TYPES

_EXTRACTION_INSTRUCTION = (
    "You extract content from a file an employee attached to a prompt inside "
    "VeriGate, an enterprise AI governance gateway. Transcribe every piece of "
    "visible or embedded text verbatim — including anything inside an image "
    "such as screenshots, photographed documents, ID cards, whiteboards, or "
    "spreadsheets — so it can be scanned for sensitive data. Do not summarize, "
    "redact, or omit sensitive-looking values (names, ID numbers, emails, "
    "phone numbers, financial figures, credentials, source code); reproduce "
    "them exactly as they appear. After the transcription, add one plain-"
    "language sentence describing what the file shows."
)


@dataclass
class AttachmentInput:
    file_name: str
    mime_type: str
    data: bytes


async def extract_content(attachment: AttachmentInput) -> str:
    """Best-effort text extraction so an attachment's content can be scanned
    by the exact same detect()/classify_intent() pipeline as promptText.
    Plain-text formats are decoded directly (cheap, no model call needed);
    everything else goes through Gemini's multimodal understanding. Falls
    back to an empty string on failure so an unreadable/unsupported file
    degrades to "no extra content detected" rather than blocking the whole
    submission."""
    if attachment.mime_type in TEXT_MIME_TYPES:
        return attachment.data.decode("utf-8", errors="replace")

    try:
        client = get_gemini_client()
        response = await client.aio.models.generate_content(
            model=_EXTRACTION_MODEL,
            contents=[
                types.Part.from_bytes(data=attachment.data, mime_type=attachment.mime_type),
                f'File name: "{attachment.file_name}"',
            ],
            config=types.GenerateContentConfig(system_instruction=_EXTRACTION_INSTRUCTION),
        )
        return response.text or ""
    except errors.APIError as error:
        logger.error(
            "Attachment content extraction failed for %r: %s", attachment.file_name, error
        )
        return ""
