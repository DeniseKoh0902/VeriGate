from fastapi import APIRouter, Depends

from app.core.dependencies import require_roles
from app.schemas.policy_recommendation import PolicyRecommendationModify, PolicyRecommendationOut
from app.schemas.user import UserOut
from app.services import policy_recommendation_service

router = APIRouter(
    prefix="/policy-recommendations",
    tags=["policy-recommendations"],
    dependencies=[Depends(require_roles("ADMIN", "COMPLIANCE"))],
)

_require_governance = require_roles("ADMIN", "COMPLIANCE")


@router.get("", response_model=list[PolicyRecommendationOut])
async def get_recommendations() -> list[PolicyRecommendationOut]:
    return await policy_recommendation_service.list_recommendations()


@router.post("/generate", response_model=list[PolicyRecommendationOut])
async def generate_recommendations(
    current_user: UserOut = Depends(_require_governance),
) -> list[PolicyRecommendationOut]:
    return await policy_recommendation_service.generate_recommendations(current_user.id)


@router.patch("/{recommendation_id}/accept", response_model=PolicyRecommendationOut)
async def accept_recommendation(
    recommendation_id: str, current_user: UserOut = Depends(_require_governance)
) -> PolicyRecommendationOut:
    return await policy_recommendation_service.accept_recommendation(
        recommendation_id, current_user.id
    )


@router.patch("/{recommendation_id}/modify", response_model=PolicyRecommendationOut)
async def modify_recommendation(
    recommendation_id: str,
    payload: PolicyRecommendationModify,
    current_user: UserOut = Depends(_require_governance),
) -> PolicyRecommendationOut:
    return await policy_recommendation_service.modify_recommendation(
        recommendation_id, payload, current_user.id
    )


@router.patch("/{recommendation_id}/reject", response_model=PolicyRecommendationOut)
async def reject_recommendation(
    recommendation_id: str, current_user: UserOut = Depends(_require_governance)
) -> PolicyRecommendationOut:
    return await policy_recommendation_service.reject_recommendation(
        recommendation_id, current_user.id
    )
