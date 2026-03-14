import secrets

import fastapi

from database import db
from dependencies import get_current_user
from models import TagCreate
from security import _now_iso

router = fastapi.APIRouter(prefix="/tags", tags=["tags"])


@router.get("")
async def list_tags(user=fastapi.Depends(get_current_user)):
    async with db() as conn:
        rows = await conn.execute_fetchall(
            "SELECT * FROM tags WHERE user_id = ? ORDER BY name",
            (user["id"],),
        )
        return [dict(r) for r in rows]


@router.post("")
async def create_tag(
    data: TagCreate,
    user=fastapi.Depends(get_current_user),
):
    tag_id = secrets.token_hex(16)
    created_at = _now_iso()
    async with db() as conn:
        await conn.execute(
            "INSERT INTO tags (id, user_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)",
            (tag_id, user["id"], data.name, data.color, created_at),
        )
        await conn.commit()
    return {"id": tag_id, "user_id": user["id"], "name": data.name,
            "color": data.color, "created_at": created_at}


@router.delete("/{tag_id}")
async def delete_tag(
    tag_id: str,
    user=fastapi.Depends(get_current_user),
):
    async with db() as conn:
        await conn.execute(
            "DELETE FROM tags WHERE id = ? AND user_id = ?", (tag_id, user["id"])
        )
        await conn.commit()
    return {"success": True}
