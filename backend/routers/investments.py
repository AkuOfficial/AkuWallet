import secrets
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import db
from dependencies import get_current_user
from security import _now_iso

router = APIRouter(prefix="/investments", tags=["investments"])

class InvestmentCreate(BaseModel):
    name: str
    type: str
    ticker: Optional[str] = None
    currency: str = "USD"
    invested_amount: float
    current_value: float
    quantity: Optional[float] = None
    is_automated: bool = False

class InvestmentUpdate(BaseModel):
    name: str
    type: str
    ticker: Optional[str] = None
    currency: str
    invested_amount: float
    current_value: float
    quantity: Optional[float] = None
    is_automated: bool

@router.get("")
async def list_investments(user: dict = Depends(get_current_user)):
    async with db() as conn:
        async with conn.execute(
            "SELECT * FROM investments WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],)
        ) as cur:
            rows = await cur.fetchall()
            return [dict(row) for row in rows]

@router.post("")
async def create_investment(data: InvestmentCreate, user: dict = Depends(get_current_user)):
    async with db() as conn:
        investment_id = secrets.token_hex(16)
        await conn.execute(
            """INSERT INTO investments (id, user_id, name, type, ticker, currency, invested_amount, 
               current_value, quantity, is_automated, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (investment_id, user["id"], data.name, data.type, data.ticker, data.currency,
             data.invested_amount, data.current_value, data.quantity, int(data.is_automated), _now_iso())
        )
        await conn.commit()
        return {"id": investment_id, **data.dict(), "created_at": _now_iso()}

@router.put("/{investment_id}")
async def update_investment(investment_id: str, data: InvestmentUpdate, user: dict = Depends(get_current_user)):
    async with db() as conn:
        await conn.execute(
            """UPDATE investments SET name = ?, type = ?, ticker = ?, currency = ?, invested_amount = ?,
               current_value = ?, quantity = ?, is_automated = ?, updated_at = ?
               WHERE id = ? AND user_id = ?""",
            (data.name, data.type, data.ticker, data.currency, data.invested_amount, data.current_value,
             data.quantity, int(data.is_automated), _now_iso(), investment_id, user["id"])
        )
        await conn.commit()
        return {"id": investment_id, **data.dict()}

@router.delete("/{investment_id}")
async def delete_investment(investment_id: str, user: dict = Depends(get_current_user)):
    async with db() as conn:
        await conn.execute("DELETE FROM investments WHERE id = ? AND user_id = ?", (investment_id, user["id"]))
        await conn.commit()
        return {"success": True}
