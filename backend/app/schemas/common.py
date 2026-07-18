from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator


def _ensure_utc(value: datetime) -> datetime:
    # Postgres columns here are TIMESTAMP (no time zone); every value written
    # to them comes from CURRENT_TIMESTAMP/NOW(), which is UTC. asyncpg reads
    # them back naive, so without this they'd serialize with no offset and
    # the browser would misread the UTC clock reading as already being local
    # time — showing times hours off from the viewer's actual time zone.
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


UtcDatetime = Annotated[datetime, AfterValidator(_ensure_utc)]
