import re
from typing import Annotated

from pydantic import AfterValidator, Field

_HAS_LETTER_AND_NUMBER = re.compile(r"(?=.*[A-Za-z])(?=.*\d)")


def _validate_complexity(value: str) -> str:
    if not _HAS_LETTER_AND_NUMBER.search(value):
        raise ValueError("Password must contain at least one letter and one number.")
    return value


# bcrypt silently ignores anything past 72 bytes, so the max isn't just a UX
# nicety — a longer password would quietly stop mattering past that point.
PasswordStr = Annotated[
    str,
    Field(min_length=8, max_length=72),
    AfterValidator(_validate_complexity),
]
