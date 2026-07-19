import json
import logging
from dataclasses import dataclass

from google.genai import errors, types

from app.core.gemini_client import get_gemini_client

logger = logging.getLogger(__name__)

_MODEL = "gemini-flash-lite-latest"


@dataclass
class UseCaseOption:
    label: str
    description: str | None


@dataclass
class IntentClassification:
    category: str
    confidence: int


def _build_system_instruction(use_cases: list[UseCaseOption]) -> str:
    lines = [
        "You classify the PURPOSE of an employee's prompt to an AI assistant "
        "inside VeriGate, an enterprise AI governance gateway. Choose exactly "
        "one category from the list below that best describes what decision "
        "or action the prompt is trying to help make — not what data it "
        "contains. Categories:",
    ]
    for option in use_cases:
        if option.description:
            lines.append(f'- "{option.label}": {option.description}')
        else:
            lines.append(f'- "{option.label}"')
    lines.append(
        '- "OTHER": ordinary work (drafting, summarizing, translating, '
        "general questions) that doesn't match any category above."
    )
    lines.append("Also return a 0-100 confidence score for how sure you are of the category.")
    return "\n".join(lines)


async def classify_intent(
    prompt_text: str, use_cases: list[UseCaseOption]
) -> IntentClassification:
    """Best-effort intent classification against the org's own admin-defined
    use cases — there's no fixed taxonomy in this module; the labels and
    descriptions the classifier picks from are whatever UseCasePolicy rows
    are currently active, supplied by the caller on every call. Falls back
    to OTHER/0 on any failure so an unavailable classifier degrades to "no
    use-case match" instead of blocking every prompt in the workspace."""
    seen: set[str] = set()
    labels: list[str] = []
    for option in use_cases:
        if option.label not in seen:
            seen.add(option.label)
            labels.append(option.label)
    labels.append("OTHER")

    schema = types.Schema(
        type="OBJECT",
        properties={
            "category": types.Schema(type="STRING", enum=labels),
            "confidence": types.Schema(type="INTEGER"),
        },
        required=["category", "confidence"],
    )

    try:
        client = get_gemini_client()
        response = await client.aio.models.generate_content(
            model=_MODEL,
            contents=prompt_text,
            config=types.GenerateContentConfig(
                system_instruction=_build_system_instruction(use_cases),
                response_mime_type="application/json",
                response_schema=schema,
            ),
        )
        data = json.loads(response.text)
        return IntentClassification(category=data["category"], confidence=int(data["confidence"]))
    except (errors.APIError, json.JSONDecodeError, KeyError, ValueError) as error:
        logger.error("Intent classification failed, defaulting to OTHER: %s", error)
        return IntentClassification(category="OTHER", confidence=0)
