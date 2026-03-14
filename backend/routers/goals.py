import secrets

import fastapi

from database import db, fetchone
from dependencies import get_current_user
from models import GoalCreate, GoalUpdate
from security import _now_iso

router = fastapi.APIRouter(prefix="/goals", tags=["goals"])


@router.get("")
async def list_goals(user=fastapi.Depends(get_current_user)):
    async with db() as conn:
        rows = await conn.execute_fetchall(
            "SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],),
        )
        return [dict(r) for r in rows]


@router.post("")
async def create_goal(
    data: GoalCreate,
    user=fastapi.Depends(get_current_user),
):
    goal_id = secrets.token_hex(16)
    created_at = _now_iso()
    async with db() as conn:
        await conn.execute(
            """
            INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (goal_id, user["id"], data.name, float(data.target_amount),
             float(data.current_amount), data.deadline, created_at),
        )
        await conn.commit()
    return {
        "id": goal_id, "user_id": user["id"], "name": data.name,
        "target_amount": float(data.target_amount), "current_amount": float(data.current_amount),
        "deadline": data.deadline, "created_at": created_at, "updated_at": None,
    }


@router.put("/{goal_id}")
async def update_goal(
    goal_id: str,
    data: GoalUpdate,
    user=fastapi.Depends(get_current_user),
):
    updated_at = _now_iso()
    async with db() as conn:
        existing = await fetchone(
            conn, "SELECT id FROM goals WHERE id = ? AND user_id = ?", (goal_id, user["id"])
        )
        if not existing:
            raise fastapi.HTTPException(status_code=404, detail="Goal not found")
        await conn.execute(
            """
            UPDATE goals
            SET name = ?, target_amount = ?, current_amount = ?, deadline = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (data.name, float(data.target_amount), float(data.current_amount),
             data.deadline, updated_at, goal_id, user["id"]),
        )
        await conn.commit()
        row = await fetchone(conn, "SELECT * FROM goals WHERE id = ?", (goal_id,))
        return dict(row)


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    user=fastapi.Depends(get_current_user),
):
    async with db() as conn:
        await conn.execute(
            "DELETE FROM goals WHERE id = ? AND user_id = ?", (goal_id, user["id"])
        )
        await conn.commit()
    return {"success": True}
