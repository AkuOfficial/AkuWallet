import fastapi
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import db, fetchone
from dependencies import get_current_user
from security import _now_iso
from security import verify_password

router = APIRouter(prefix="/settings", tags=["settings"])

class UserSettingsUpdate(BaseModel):
    base_currency: str


class DeleteAccountRequest(BaseModel):
    password: str | None = None
    confirm: str | None = None

@router.get("")
async def get_settings(user: dict = Depends(get_current_user)):
    async with db() as conn:
        row = await fetchone(conn, "SELECT * FROM user_settings WHERE user_id = ?", (user["id"],))
        if row:
            return dict(row)
        await conn.execute(
            "INSERT INTO user_settings (user_id, base_currency, created_at) VALUES (?, ?, ?)",
            (user["id"], "USD", _now_iso())
        )
        await conn.commit()
        return {"user_id": user["id"], "base_currency": "USD"}

@router.put("")
async def update_settings(data: UserSettingsUpdate, user: dict = Depends(get_current_user)):
    async with db() as conn:
        existing = await fetchone(conn, "SELECT * FROM user_settings WHERE user_id = ?", (user["id"],))
        if existing:
            await conn.execute(
                "UPDATE user_settings SET base_currency = ?, updated_at = ? WHERE user_id = ?",
                (data.base_currency, _now_iso(), user["id"])
            )
        else:
            await conn.execute(
                "INSERT INTO user_settings (user_id, base_currency, created_at) VALUES (?, ?, ?)",
                (user["id"], data.base_currency, _now_iso())
            )
        await conn.commit()
        return {"user_id": user["id"], **data.dict()}


@router.get("/export")
async def export_all_data(
    user: dict = Depends(get_current_user),
    format: str = "json",
):
    if format not in ("json",):
        raise fastapi.HTTPException(status_code=400, detail="Unsupported format")

    async with db() as conn:
        settings = await fetchone(conn, "SELECT * FROM user_settings WHERE user_id = ?", (user["id"],))
        categories = await conn.execute_fetchall(
            "SELECT * FROM categories WHERE (user_id = ?) OR (is_default = 1) ORDER BY name",
            (user["id"],),
        )
        tags = await conn.execute_fetchall("SELECT * FROM tags WHERE user_id = ? ORDER BY name", (user["id"],))
        goals = await conn.execute_fetchall("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC", (user["id"],))
        accounts = await conn.execute_fetchall("SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC", (user["id"],))
        investments = await conn.execute_fetchall(
            "SELECT * FROM investments WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],),
        )
        transactions = await conn.execute_fetchall(
            "SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC",
            (user["id"],),
        )
        transaction_tags = await conn.execute_fetchall(
            """
            SELECT tt.*
            FROM transaction_tags tt
            JOIN transactions t ON t.id = tt.transaction_id
            WHERE t.user_id = ?
            """,
            (user["id"],),
        )
        rules = await conn.execute_fetchall(
            "SELECT * FROM automation_rules WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],),
        )

    return {
        "user": {"id": user["id"], "email": user["email"], "created_at": user["created_at"]},
        "settings": dict(settings) if settings else None,
        "categories": [dict(r) for r in categories],
        "tags": [dict(r) for r in tags],
        "goals": [dict(r) for r in goals],
        "accounts": [dict(r) for r in accounts],
        "investments": [dict(r) for r in investments],
        "transactions": [dict(r) for r in transactions],
        "transaction_tags": [dict(r) for r in transaction_tags],
        "automation_rules": [dict(r) for r in rules],
        "exported_at": _now_iso(),
    }


@router.post("/clear-transactions")
async def clear_all_transactions(user: dict = Depends(get_current_user)):
    async with db() as conn:
        await conn.execute("DELETE FROM transactions WHERE user_id = ?", (user["id"],))
        await conn.commit()
    return {"success": True}


@router.post("/delete-account")
async def delete_account(req: DeleteAccountRequest, user: dict = Depends(get_current_user)):
    confirm_ok = (req.confirm or "").strip().upper() == "DELETE"

    async with db() as conn:
        row = await fetchone(conn, "SELECT password_hash FROM users WHERE id = ?", (user["id"],))
        if not row:
            raise fastapi.HTTPException(status_code=404, detail="User not found")
        password_ok = bool(req.password) and verify_password(req.password, row["password_hash"])

        if not (confirm_ok or password_ok):
            raise fastapi.HTTPException(status_code=400, detail="Confirmation required")

        await conn.execute("DELETE FROM sessions WHERE user_id = ?", (user["id"],))
        await conn.execute("DELETE FROM users WHERE id = ?", (user["id"],))
        await conn.commit()

    return {"success": True}
