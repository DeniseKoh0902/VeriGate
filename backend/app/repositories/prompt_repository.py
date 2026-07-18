import uuid

import asyncpg


async def get_or_create_active_session(pool: asyncpg.Pool, user_id: str, ai_tool_id: str) -> str:
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            """
            SELECT "id" FROM "ai_sessions"
            WHERE "userId" = $1 AND "aiToolId" = $2 AND "status" = 'ACTIVE'
            ORDER BY "startedAt" DESC
            LIMIT 1
            """,
            user_id,
            ai_tool_id,
        )
        if existing:
            return existing["id"]

        session_id = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO "ai_sessions" ("id", "userId", "aiToolId")
            VALUES ($1, $2, $3)
            """,
            session_id,
            user_id,
            ai_tool_id,
        )
        return session_id


async def create_prompt(
    pool: asyncpg.Pool,
    *,
    session_id: str,
    prompt_text: str,
    sanitized_text: str | None,
    contains_sensitive_data: bool,
    status: str,
) -> asyncpg.Record:
    prompt_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "prompts"
                ("id", "sessionId", "promptText", "sanitizedText", "containsSensitiveData", "status")
            VALUES ($1, $2, $3, $4, $5, $6::"PromptStatus")
            RETURNING *
            """,
            prompt_id,
            session_id,
            prompt_text,
            sanitized_text,
            contains_sensitive_data,
            status,
        )


async def create_prompt_risk_finding(
    pool: asyncpg.Pool,
    *,
    prompt_id: str,
    rule_id: str | None,
    category: str,
    risk_level: str,
    note: str | None,
) -> asyncpg.Record:
    finding_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "prompt_risk_findings"
                ("id", "promptId", "ruleId", "category", "riskLevel", "note")
            VALUES ($1, $2, $3, $4, $5::"RiskLevel", $6)
            RETURNING *
            """,
            finding_id,
            prompt_id,
            rule_id,
            category,
            risk_level,
            note,
        )


async def list_prompts_for_user(pool: asyncpg.Pool, user_id: str) -> list[asyncpg.Record]:
    async with pool.acquire() as conn:
        prompts = await conn.fetch(
            """
            SELECT p."id", p."promptText", p."sanitizedText", p."status", p."createdAt",
                   r."responseText"
            FROM "prompts" p
            JOIN "ai_sessions" s ON s."id" = p."sessionId"
            LEFT JOIN "ai_responses" r ON r."promptId" = p."id"
            WHERE s."userId" = $1
            ORDER BY p."createdAt" ASC
            """,
            user_id,
        )
        if not prompts:
            return []

        findings = await conn.fetch(
            """
            SELECT "promptId", "category", "riskLevel", "note"
            FROM "prompt_risk_findings"
            WHERE "promptId" = ANY($1::text[])
            """,
            [p["id"] for p in prompts],
        )

    findings_by_prompt: dict[str, list[asyncpg.Record]] = {}
    for finding in findings:
        findings_by_prompt.setdefault(finding["promptId"], []).append(finding)

    return [
        {**dict(p), "riskFindings": findings_by_prompt.get(p["id"], [])} for p in prompts
    ]


async def get_prompt_by_id(pool: asyncpg.Pool, prompt_id: str) -> dict | None:
    async with pool.acquire() as conn:
        prompt = await conn.fetchrow(
            'SELECT "id", "promptText", "sanitizedText", "status", "createdAt" FROM "prompts" WHERE "id" = $1',
            prompt_id,
        )
        if prompt is None:
            return None

        findings = await conn.fetch(
            'SELECT "category", "riskLevel", "note" FROM "prompt_risk_findings" WHERE "promptId" = $1',
            prompt_id,
        )

    return {**dict(prompt), "riskFindings": findings}


async def get_ai_response_by_prompt_id(pool: asyncpg.Pool, prompt_id: str) -> asyncpg.Record | None:
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            'SELECT * FROM "ai_responses" WHERE "promptId" = $1', prompt_id
        )


async def create_ai_response(
    pool: asyncpg.Pool,
    *,
    prompt_id: str,
    response_text: str,
    response_time_ms: int,
) -> asyncpg.Record:
    response_id = str(uuid.uuid4())
    async with pool.acquire() as conn:
        return await conn.fetchrow(
            """
            INSERT INTO "ai_responses" ("id", "promptId", "responseText", "responseTimeMs")
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            response_id,
            prompt_id,
            response_text,
            response_time_ms,
        )
