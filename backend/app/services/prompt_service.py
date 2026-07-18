import logging
import time

from fastapi import HTTPException
from fastapi import status as http_status
from google.genai import errors, types

from app.core.gemini_client import get_gemini_client
from app.db.pool import get_pool
from app.repositories import (
    ai_tool_repository,
    audit_log_repository,
    prompt_repository,
    risk_alert_repository,
    sensitive_data_rule_repository,
)
from app.schemas.prompt import (
    ChatSessionOut,
    PromptHistoryItem,
    PromptSubmitRequest,
    PromptSubmitResponse,
    RiskFindingOut,
    SanitizationChangeOut,
)
from app.services import detection_service

logger = logging.getLogger(__name__)

_MODEL = "gemini-flash-lite-latest"
_SYSTEM_INSTRUCTION = (
    "You are an AI assistant helping an employee complete a work task inside "
    "VeriGate, a governed AI workspace. Respond helpfully and concisely to "
    "the user's request."
)


async def generate_ai_response(prompt_text: str) -> str:
    try:
        client = get_gemini_client()
        response = await client.aio.models.generate_content(
            model=_MODEL,
            contents=prompt_text,
            config=types.GenerateContentConfig(system_instruction=_SYSTEM_INSTRUCTION),
        )
        return response.text or "The AI model returned an empty response."
    except errors.APIError as error:
        logger.error("Gemini API error (code=%s): %s", error.code, error.message)
        if error.code == 429:
            return "The AI model is getting a lot of requests right now — please try again shortly."
        return "Unable to reach the AI model right now. Please try again."


async def submit_prompt(payload: PromptSubmitRequest, user_id: str) -> PromptSubmitResponse:
    pool = get_pool()

    ai_tool = await ai_tool_repository.get_or_create_ai_tool_by_name(pool, payload.aiToolName)

    if payload.sessionId:
        session = await prompt_repository.get_session(pool, payload.sessionId, user_id)
        if session is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Chat session not found."
            )
        session_id = session["id"]
    else:
        session_id = await prompt_repository.create_session(
            pool, user_id=user_id, ai_tool_id=ai_tool["id"]
        )

    active_rules = await sensitive_data_rule_repository.list_active_rules(pool)
    matches = detection_service.detect(payload.promptText, active_rules)
    action = detection_service.resolve_action(matches)

    sanitization_changes: list[detection_service.SanitizationChange] = []

    if action == "BLOCK":
        status = "BLOCKED"
        sanitized_text = None
        final_text = None
    elif action == "SANITIZE":
        status = "SANITIZED"
        sanitized_text, sanitization_changes = detection_service.sanitize(
            payload.promptText, matches
        )
        final_text = sanitized_text
    else:
        status = "FORWARDED"
        sanitized_text = None
        final_text = payload.promptText

    prompt = await prompt_repository.create_prompt(
        pool,
        session_id=session_id,
        prompt_text=payload.promptText,
        sanitized_text=sanitized_text,
        contains_sensitive_data=bool(matches),
        status=status,
    )

    for match in matches:
        await prompt_repository.create_prompt_risk_finding(
            pool,
            prompt_id=prompt["id"],
            rule_id=match.rule_id,
            category=match.category,
            risk_level=match.risk_level,
            note=f'Matched "{match.matched_text}" against an active Sensitive Data Rule.',
        )

    if action == "BLOCK":
        await risk_alert_repository.create_risk_alert(
            pool,
            user_id=user_id,
            prompt_id=prompt["id"],
            alert_type=matches[0].category if matches else "Policy Violation",
            severity=matches[0].risk_level if matches else "HIGH",
            description=f'Prompt blocked by Sensitive Data Rule "{matches[0].category}".'
            if matches
            else "Prompt blocked by governance policy.",
        )

    await audit_log_repository.create_audit_log(
        pool,
        user_id=user_id,
        action=f"Prompt {status.title()}",
        entity_type="Prompt",
        entity_id=prompt["id"],
    )

    response_text = None
    if final_text is not None:
        start = time.perf_counter()
        response_text = await generate_ai_response(final_text)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        await prompt_repository.create_ai_response(
            pool,
            prompt_id=prompt["id"],
            response_text=response_text,
            response_time_ms=elapsed_ms,
        )

    return PromptSubmitResponse(
        promptId=prompt["id"],
        sessionId=session_id,
        status=status,
        sanitizedText=sanitized_text,
        riskFindings=[
            RiskFindingOut(category=m.category, riskLevel=m.risk_level, note=m.matched_text)
            for m in matches
        ],
        sanitizationChanges=[
            SanitizationChangeOut(original=c.original, replacement=c.replacement)
            for c in sanitization_changes
        ],
        responseText=response_text,
    )


def _to_history_item(row: dict) -> PromptHistoryItem:
    return PromptHistoryItem(
        promptId=row["id"],
        promptText=row["promptText"],
        status=row["status"],
        sanitizedText=row["sanitizedText"],
        riskFindings=[
            RiskFindingOut(category=f["category"], riskLevel=f["riskLevel"], note=f["note"])
            for f in row["riskFindings"]
        ],
        responseText=row["responseText"],
        createdAt=row["createdAt"],
    )


async def list_chat_sessions(user_id: str) -> list[ChatSessionOut]:
    pool = get_pool()
    rows = await prompt_repository.list_sessions_for_user(pool, user_id)
    return [ChatSessionOut(**dict(row)) for row in rows]


async def get_session_messages(session_id: str, user_id: str) -> list[PromptHistoryItem]:
    pool = get_pool()
    session = await prompt_repository.get_session(pool, session_id, user_id)
    if session is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Chat session not found.")

    rows = await prompt_repository.list_prompts_for_session(pool, session_id)
    return [_to_history_item(row) for row in rows]
