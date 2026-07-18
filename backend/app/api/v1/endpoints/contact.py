from fastapi import APIRouter

from app.schemas.contact import AdminContactOut
from app.services import contact_service

router = APIRouter(prefix="/contact", tags=["contact"])


# Deliberately public (no auth dependency): an employee locked out of their
# account has no token yet, and needs a way to find who can help them.
# Scoped to name + email only — never department, id, or anything else off
# UserOut — to keep the disclosure surface as small as possible.
@router.get("/it-admins", response_model=list[AdminContactOut])
async def get_it_admin_contacts() -> list[AdminContactOut]:
    return await contact_service.get_it_admin_contacts()
