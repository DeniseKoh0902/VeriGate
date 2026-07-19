from typing import Literal

from pydantic import BaseModel

from app.schemas.common import UtcDatetime

ScanTrigger = Literal["MANUAL", "SCHEDULED"]


class AiToolUsageScanOut(BaseModel):
    id: str
    aiToolId: str
    windowStart: UtcDatetime
    windowEnd: UtcDatetime
    promptCount: int
    blockRate: float
    sensitiveDataMatchRate: float
    isDriftFlagged: bool
    aiSummary: str | None
    triggeredBy: ScanTrigger
    scannedAt: UtcDatetime
