import secrets

import fastapi

from database import db
from dependencies import get_current_user
from models import CategoryCreate
from security import _now_iso

router = fastapi.APIRouter(prefix="/categories", tags=["categories"])


@router.get("")
async def list_categories(user=fastapi.Depends(get_current_user)):
    async with db() as conn:
        rows = await conn.execute_fetchall(
            "SELECT * FROM categories WHERE (user_id = ?) OR (is_default = 1) ORDER BY name",
            (user["id"],),
        )
        return [dict(r) for r in rows]


@router.post("")
async def create_category(
    data: CategoryCreate,
    user=fastapi.Depends(get_current_user),
):
    cat_id = secrets.token_hex(16)
    created_at = _now_iso()
    async with db() as conn:
        await conn.execute(
            """
            INSERT INTO categories (id, user_id, name, type, icon, color, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (cat_id, user["id"], data.name, data.type, data.icon, data.color, created_at),
        )
        await conn.commit()
    return {
        "id": cat_id, "user_id": user["id"], "name": data.name, "type": data.type,
        "icon": data.icon, "color": data.color, "is_default": False, "created_at": created_at,
    }


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    user=fastapi.Depends(get_current_user),
):
    async with db() as conn:
        await conn.execute(
            "DELETE FROM categories WHERE id = ? AND user_id = ? AND is_default = 0",
            (category_id, user["id"]),
        )
        await conn.commit()
    return {"success": True}
