import secrets
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import db, fetchone
from dependencies import get_current_user
from security import _now_iso

router = APIRouter(prefix="/accounts", tags=["accounts"])

class AccountCreate(BaseModel):
    name: str
    type: str
    currency: str = "PLN"
    balance: float = 0

class AccountUpdate(BaseModel):
    name: str
    type: str
    currency: str
    balance: float

class AccountDeleteRequest(BaseModel):
    transfer_to_account_id: str

@router.get("")
async def list_accounts(user: dict = Depends(get_current_user)):
    async with db() as conn:
        async with conn.execute(
            "SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],)
        ) as cur:
            rows = await cur.fetchall()
            return [dict(row) for row in rows]

@router.post("")
async def create_account(data: AccountCreate, user: dict = Depends(get_current_user)):
    async with db() as conn:
        existing = await fetchone(
            conn,
            "SELECT id FROM accounts WHERE user_id = ? AND lower(name) = lower(?)",
            (user["id"], data.name.strip()),
        )
        if existing:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Account name already exists")
        account_id = secrets.token_hex(16)
        await conn.execute(
            """INSERT INTO accounts (id, user_id, name, type, currency, balance, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (account_id, user["id"], data.name.strip(), data.type, data.currency, data.balance, _now_iso())
        )
        await conn.commit()
        return {"id": account_id, **data.dict(), "created_at": _now_iso()}

@router.put("/{account_id}")
async def update_account(account_id: str, data: AccountUpdate, user: dict = Depends(get_current_user)):
    async with db() as conn:
        existing = await fetchone(
            conn,
            "SELECT id FROM accounts WHERE user_id = ? AND lower(name) = lower(?) AND id <> ?",
            (user["id"], data.name.strip(), account_id),
        )
        if existing:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Account name already exists")
        await conn.execute(
            """UPDATE accounts SET name = ?, type = ?, currency = ?, balance = ?, updated_at = ?
               WHERE id = ? AND user_id = ?""",
            (data.name.strip(), data.type, data.currency, data.balance, _now_iso(), account_id, user["id"])
        )
        await conn.commit()
        return {"id": account_id, **data.dict()}

@router.delete("/{account_id}")
async def delete_account(account_id: str, payload: AccountDeleteRequest, user: dict = Depends(get_current_user)):
    async with db() as conn:
        source = await fetchone(
            conn,
            "SELECT id FROM accounts WHERE id = ? AND user_id = ?",
            (account_id, user["id"]),
        )
        if not source:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Account not found")

        target = await fetchone(
            conn,
            "SELECT id FROM accounts WHERE id = ? AND user_id = ?",
            (payload.transfer_to_account_id, user["id"]),
        )
        if not target or target["id"] == account_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Valid transfer account is required")

        count_row = await fetchone(
            conn,
            "SELECT COUNT(1) AS c FROM accounts WHERE user_id = ?",
            (user["id"],),
        )
        if (count_row["c"] if count_row else 0) <= 1:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="At least one account must remain")

        await conn.execute(
            "UPDATE transactions SET account_id = ? WHERE user_id = ? AND account_id = ?",
            (payload.transfer_to_account_id, user["id"], account_id),
        )
        await conn.commit()
        await conn.execute("DELETE FROM accounts WHERE id = ? AND user_id = ?", (account_id, user["id"]))
        await conn.commit()
        return {"success": True}
