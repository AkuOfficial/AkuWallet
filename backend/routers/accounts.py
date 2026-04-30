import secrets
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import db
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
        account_id = secrets.token_hex(16)
        await conn.execute(
            """INSERT INTO accounts (id, user_id, name, type, currency, balance, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (account_id, user["id"], data.name, data.type, data.currency, data.balance, _now_iso())
        )
        await conn.commit()
        return {"id": account_id, **data.dict(), "created_at": _now_iso()}

@router.put("/{account_id}")
async def update_account(account_id: str, data: AccountUpdate, user: dict = Depends(get_current_user)):
    async with db() as conn:
        await conn.execute(
            """UPDATE accounts SET name = ?, type = ?, currency = ?, balance = ?, updated_at = ?
               WHERE id = ? AND user_id = ?""",
            (data.name, data.type, data.currency, data.balance, _now_iso(), account_id, user["id"])
        )
        await conn.commit()
        return {"id": account_id, **data.dict()}

@router.delete("/{account_id}")
async def delete_account(account_id: str, user: dict = Depends(get_current_user)):
    async with db() as conn:
        await conn.execute("DELETE FROM accounts WHERE id = ? AND user_id = ?", (account_id, user["id"]))
        await conn.commit()
        return {"success": True}
