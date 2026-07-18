from typing import Literal

from pydantic import BaseModel

from app.schemas.common import UtcDatetime

RecommendationStatus = Literal["PENDING", "ACCEPTED", "MODIFIED", "REJECTED"]


class PolicyRecommendationOut(BaseModel):
    id: str
    title: str
    rationale: str
    department: str | None
    confidenceScore: int
    status: RecommendationStatus
    generatedAt: UtcDatetime
    reviewedById: str | None
    reviewedAt: UtcDatetime | None


class PolicyRecommendationModify(BaseModel):
    title: str
    rationale: str
