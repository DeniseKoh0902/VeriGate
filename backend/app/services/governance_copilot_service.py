import logging
from datetime import datetime
from decimal import Decimal

import asyncpg
from fastapi import HTTPException, status
from google import genai
from google.genai import errors, types

from app.core.config import get_settings
from app.db.pool import get_pool
from app.repositories import governance_copilot_repository
from app.schemas.governance_copilot import ChatMessage, GovernanceCopilotRequest

logger = logging.getLogger(__name__)

_MODEL = "gemini-flash-lite-latest"
_MAX_TOOL_ITERATIONS = 5

_SYSTEM_INSTRUCTION = (
    "You are the VeriGate Governance Copilot, an assistant embedded in an AI "
    "governance dashboard for enterprise IT and compliance teams. "
    "You can look up real data via the tools provided: active policies, an AI "
    "tool's approval status and trust scores, top risk alert types, per-department "
    "alert/blocked-prompt stats, recent audit log entries, policy recommendations, "
    "and an overall governance summary. "
    "Always call a tool before stating any specific number, name, date, score, or "
    "incident — never invent one. If a tool returns no matching rows, say plainly "
    "that there is no data for that, rather than making something up. "
    "You only explain and summarize; you have no authority to approve or reject "
    "AI tools, modify policies, or resolve risk alerts — those remain human "
    "decisions, and you should say so if asked to take one of those actions."
)

_TOOLS = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="list_policies",
            description="List active governance policies, optionally filtered by department.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "department": types.Schema(
                        type="STRING",
                        description="Department to filter by, e.g. 'Finance'. Omit for all.",
                    ),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="get_ai_tool_status",
            description=(
                "Get an AI tool's approval status, risk tier, and latest trust "
                "evaluation scores (security, privacy, compliance, availability, "
                "explainability, org policy, overall)."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "tool_name": types.Schema(
                        type="STRING", description="Name of the AI tool, e.g. 'Gemini Pro'."
                    ),
                },
                required=["tool_name"],
            ),
        ),
        types.FunctionDeclaration(
            name="get_top_risk_alerts",
            description="Get the most frequent risk alert types over a recent period.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "days": types.Schema(
                        type="INTEGER", description="Lookback window in days. Defaults to 30."
                    ),
                    "limit": types.Schema(
                        type="INTEGER", description="Max alert types to return. Defaults to 5."
                    ),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="get_department_alert_stats",
            description=(
                "Get risk alert counts, blocked prompt counts, and share of total "
                "alerts, broken down by department, for a recent period."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "days": types.Schema(
                        type="INTEGER", description="Lookback window in days. Defaults to 30."
                    ),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="get_recent_audit_logs",
            description="Get recent audit log entries, optionally filtered by entity type.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "entity_type": types.Schema(
                        type="STRING",
                        description="Entity type to filter by, e.g. 'Policy' or 'AiTool'. Omit for all.",
                    ),
                    "limit": types.Schema(
                        type="INTEGER", description="Max entries to return. Defaults to 10."
                    ),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="get_policy_recommendations",
            description="Get AI-generated policy recommendations, optionally filtered by status.",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "status": types.Schema(
                        type="STRING",
                        description="One of PENDING, ACCEPTED, MODIFIED, REJECTED. Omit for all.",
                    ),
                },
            ),
        ),
        types.FunctionDeclaration(
            name="get_governance_summary",
            description=(
                "Get an overall governance summary for a recent period: total risk "
                "alerts, total blocked prompts, pending tool requests, the most "
                "common alert type, and the department with the most alerts."
            ),
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "days": types.Schema(
                        type="INTEGER", description="Lookback window in days. Defaults to 7."
                    ),
                },
            ),
        ),
    ]
)

# Reused across requests rather than constructed per-call.
_client = genai.Client(api_key=get_settings().gemini_api_key)


def _to_gemini_role(role: str) -> str:
    return "model" if role == "copilot" else "user"


def _jsonable(value: object) -> object:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _record_to_dict(record: asyncpg.Record) -> dict:
    return {key: _jsonable(value) for key, value in dict(record).items()}


async def _execute_tool(name: str, args: dict) -> object:
    pool = get_pool()

    if name == "list_policies":
        rows = await governance_copilot_repository.list_policies(
            pool, department=args.get("department")
        )
        return [_record_to_dict(row) for row in rows]

    if name == "get_ai_tool_status":
        row = await governance_copilot_repository.get_ai_tool_status(
            pool, tool_name=args["tool_name"]
        )
        return _record_to_dict(row) if row else {"error": "No matching AI tool found."}

    if name == "get_top_risk_alerts":
        rows = await governance_copilot_repository.get_top_risk_alerts(
            pool, days=int(args.get("days", 30)), limit=int(args.get("limit", 5))
        )
        return [_record_to_dict(row) for row in rows]

    if name == "get_department_alert_stats":
        rows = await governance_copilot_repository.get_department_alert_stats(
            pool, days=int(args.get("days", 30))
        )
        return [_record_to_dict(row) for row in rows]

    if name == "get_recent_audit_logs":
        rows = await governance_copilot_repository.get_recent_audit_logs(
            pool, entity_type=args.get("entity_type"), limit=int(args.get("limit", 10))
        )
        return [_record_to_dict(row) for row in rows]

    if name == "get_policy_recommendations":
        rows = await governance_copilot_repository.get_policy_recommendations(
            pool, status=args.get("status")
        )
        return [_record_to_dict(row) for row in rows]

    if name == "get_governance_summary":
        return await governance_copilot_repository.get_governance_summary(
            pool, days=int(args.get("days", 7))
        )

    return {"error": f"Unknown tool: {name}"}


async def ask(payload: GovernanceCopilotRequest) -> ChatMessage:
    contents = [
        types.Content(role=_to_gemini_role(message.role), parts=[types.Part(text=message.text)])
        for message in payload.messages
    ]
    config = types.GenerateContentConfig(
        system_instruction=_SYSTEM_INSTRUCTION,
        tools=[_TOOLS],
    )

    try:
        for _ in range(_MAX_TOOL_ITERATIONS):
            response = await _client.aio.models.generate_content(
                model=_MODEL, contents=contents, config=config
            )
            candidate = response.candidates[0]
            contents.append(candidate.content)

            function_calls = [
                part.function_call for part in candidate.content.parts if part.function_call
            ]
            if not function_calls:
                return ChatMessage(role="copilot", text=response.text or "")

            response_parts = []
            for call in function_calls:
                result = await _execute_tool(call.name, dict(call.args or {}))
                response_parts.append(
                    types.Part.from_function_response(name=call.name, response={"result": result})
                )
            contents.append(types.Content(role="user", parts=response_parts))
    except errors.APIError as error:
        logger.error("Gemini API error (code=%s): %s", error.code, error.message)
        if error.code == 429:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Governance Copilot is getting a lot of requests right now — wait a moment and try again.",
            ) from error
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Governance Copilot is temporarily unavailable.",
        ) from error

    return ChatMessage(
        role="copilot",
        text="I looked into that but wasn't able to finish within the allotted steps — try narrowing the question.",
    )