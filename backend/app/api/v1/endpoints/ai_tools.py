from fastapi import APIRouter, Depends, status

from app.core.dependencies import require_roles
from app.schemas.ai_tool import (
    AiToolCreate,
    AiToolOut,
    AiToolUpdate,
    AiTrustEvaluationCreate,
    AiTrustEvaluationOut,
    AiTrustEvaluationProposal,
    AiTrustEvaluationUpdate,
)
from app.schemas.bias_drift import AiToolUsageScanOut
from app.schemas.user import UserOut
from app.services import ai_tool_service, bias_drift_service

router = APIRouter(
    prefix="/ai-tools",
    tags=["ai-tools"],
    dependencies=[Depends(require_roles("ADMIN"))],
)

_require_admin = require_roles("ADMIN")


@router.get("", response_model=list[AiToolOut])
async def get_ai_tools() -> list[AiToolOut]:
    return await ai_tool_service.list_ai_tools()


@router.post("", response_model=AiToolOut, status_code=status.HTTP_201_CREATED)
async def create_ai_tool(
    payload: AiToolCreate, current_user: UserOut = Depends(_require_admin)
) -> AiToolOut:
    return await ai_tool_service.create_ai_tool(payload, current_user.id)


@router.patch("/{tool_id}", response_model=AiToolOut)
async def update_ai_tool(
    tool_id: str, payload: AiToolUpdate, current_user: UserOut = Depends(_require_admin)
) -> AiToolOut:
    return await ai_tool_service.update_ai_tool(tool_id, payload, current_user.id)


@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_tool(
    tool_id: str, current_user: UserOut = Depends(_require_admin)
) -> None:
    await ai_tool_service.delete_ai_tool(tool_id, current_user.id)


@router.post("/{tool_id}/trust-evaluations/propose", response_model=AiTrustEvaluationProposal)
async def propose_trust_evaluation(tool_id: str) -> AiTrustEvaluationProposal:
    return await ai_tool_service.propose_trust_evaluation(tool_id)


@router.post(
    "/{tool_id}/trust-evaluations",
    response_model=AiTrustEvaluationOut,
    status_code=status.HTTP_201_CREATED,
)
async def resolve_trust_evaluation(
    tool_id: str,
    payload: AiTrustEvaluationCreate,
    current_user: UserOut = Depends(_require_admin),
) -> AiTrustEvaluationOut:
    return await ai_tool_service.resolve_trust_evaluation(tool_id, payload, current_user.id)


@router.get("/{tool_id}/trust-evaluations/latest", response_model=AiTrustEvaluationOut | None)
async def get_latest_trust_evaluation(tool_id: str) -> AiTrustEvaluationOut | None:
    return await ai_tool_service.get_latest_trust_evaluation(tool_id)


@router.patch("/{tool_id}/trust-evaluations/latest", response_model=AiTrustEvaluationOut)
async def update_trust_evaluation(
    tool_id: str,
    payload: AiTrustEvaluationUpdate,
    current_user: UserOut = Depends(_require_admin),
) -> AiTrustEvaluationOut:
    return await ai_tool_service.update_trust_evaluation(tool_id, payload, current_user.id)


# The block-rate/sensitive-data-rate scan (bias_drift_service.run_scan) has
# no manual trigger anymore — it only runs on the weekly cron job in
# main.py. This endpoint is what "Re-evaluate All" in AI Tool Management
# calls instead: it re-scores every approved tool's trust score from real
# usage evidence, which is the thing an admin actually wants to trigger
# on demand.
#
# Static "/reevaluate-all" is registered ahead of any "/{tool_id}/..." usage
# so the literal path segment can never be shadowed by the dynamic one.
@router.post("/reevaluate-all", response_model=list[AiTrustEvaluationOut])
async def reevaluate_all_approved_tools(
    current_user: UserOut = Depends(_require_admin),
) -> list[AiTrustEvaluationOut]:
    return await bias_drift_service.reevaluate_all_approved_tools(current_user.id)


@router.get("/{tool_id}/usage-scans", response_model=list[AiToolUsageScanOut])
async def get_usage_scans(tool_id: str) -> list[AiToolUsageScanOut]:
    return await bias_drift_service.list_scans_for_tool(tool_id)
