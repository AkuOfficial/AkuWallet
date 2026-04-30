import secrets
from typing import Any, Optional

import fastapi
from pydantic import BaseModel

from database import db, fetchone
from dependencies import get_current_user
from security import _now_iso


router = fastapi.APIRouter(prefix="/automation-rules", tags=["automation-rules"])


class AutomationRuleCreate(BaseModel):
    name: Optional[str] = None
    match_contains: str
    category_id: str
    enabled: bool = True


class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = None
    match_contains: str
    category_id: str
    enabled: bool = True


@router.get("")
async def list_rules(user=fastapi.Depends(get_current_user)) -> list[dict[str, Any]]:
    async with db() as conn:
        rows = await conn.execute_fetchall(
            """
            SELECT r.*, c.name AS category_name, c.type AS category_type
            FROM automation_rules r
            JOIN categories c ON c.id = r.category_id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
            """,
            (user["id"],),
        )
        return [dict(r) for r in rows]


@router.post("")
async def create_rule(data: AutomationRuleCreate, user=fastapi.Depends(get_current_user)) -> dict[str, Any]:
    rule_id = secrets.token_hex(16)
    created_at = _now_iso()
    async with db() as conn:
        cat = await fetchone(
            conn,
            "SELECT id FROM categories WHERE id = ? AND ((user_id = ?) OR (is_default = 1))",
            (data.category_id, user["id"]),
        )
        if not cat:
            raise fastapi.HTTPException(status_code=400, detail="Invalid category")
        await conn.execute(
            """
            INSERT INTO automation_rules (id, user_id, name, match_contains, category_id, enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rule_id,
                user["id"],
                data.name,
                data.match_contains,
                data.category_id,
                1 if data.enabled else 0,
                created_at,
            ),
        )
        await conn.commit()
    return {
        "id": rule_id,
        "user_id": user["id"],
        "name": data.name,
        "match_contains": data.match_contains,
        "category_id": data.category_id,
        "enabled": data.enabled,
        "created_at": created_at,
        "updated_at": None,
    }


@router.put("/{rule_id}")
async def update_rule(
    rule_id: str, data: AutomationRuleUpdate, user=fastapi.Depends(get_current_user)
) -> dict[str, Any]:
    updated_at = _now_iso()
    async with db() as conn:
        existing = await fetchone(
            conn, "SELECT * FROM automation_rules WHERE id = ? AND user_id = ?", (rule_id, user["id"])
        )
        if not existing:
            raise fastapi.HTTPException(status_code=404, detail="Rule not found")
        cat = await fetchone(
            conn,
            "SELECT id FROM categories WHERE id = ? AND ((user_id = ?) OR (is_default = 1))",
            (data.category_id, user["id"]),
        )
        if not cat:
            raise fastapi.HTTPException(status_code=400, detail="Invalid category")
        await conn.execute(
            """
            UPDATE automation_rules
            SET name = ?, match_contains = ?, category_id = ?, enabled = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (
                data.name,
                data.match_contains,
                data.category_id,
                1 if data.enabled else 0,
                updated_at,
                rule_id,
                user["id"],
            ),
        )
        await conn.commit()
    return {
        "id": rule_id,
        "user_id": user["id"],
        "name": data.name,
        "match_contains": data.match_contains,
        "category_id": data.category_id,
        "enabled": data.enabled,
        "created_at": existing["created_at"],
        "updated_at": updated_at,
    }


@router.delete("/{rule_id}")
async def delete_rule(rule_id: str, user=fastapi.Depends(get_current_user)) -> dict[str, bool]:
    async with db() as conn:
        await conn.execute("DELETE FROM automation_rules WHERE id = ? AND user_id = ?", (rule_id, user["id"]))
        await conn.commit()
    return {"success": True}

