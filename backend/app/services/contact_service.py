from app.db.pool import get_pool
from app.repositories.user_repository import list_admin_contacts
from app.schemas.contact import AdminContactOut


async def get_it_admin_contacts() -> list[AdminContactOut]:
    pool = get_pool()
    rows = await list_admin_contacts(pool)
    return [AdminContactOut(**dict(row)) for row in rows]
