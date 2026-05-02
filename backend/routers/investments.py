import secrets
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import db
from dependencies import get_current_user
from security import _now_iso
from services.exchange_rates import convert_amount
from services.market_prices import get_ticker_price

router = APIRouter(prefix="/investments", tags=["investments"])

class InvestmentCreate(BaseModel):
    name: str
    type: str
    ticker: Optional[str] = None
    currency: str = "USD"
    invested_amount: float
    current_value: float
    quantity: Optional[float] = None
    commission: float = 0.0
    is_automated: bool = False

class InvestmentUpdate(BaseModel):
    name: str
    type: str
    ticker: Optional[str] = None
    currency: str
    invested_amount: float
    current_value: float
    quantity: Optional[float] = None
    commission: float = 0.0
    is_automated: bool

@router.get("/price/{ticker}")
async def get_investment_price(ticker: str, _: dict = Depends(get_current_user)):
    price = await get_ticker_price(ticker.upper())
    if price is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Price not found")
    return {"ticker": ticker.upper(), "price": float(price)}

@router.get("/summary")
async def get_investments_summary(user: dict = Depends(get_current_user)):
    async with db() as conn:
        settings_row = await conn.execute(
            "SELECT base_currency FROM user_settings WHERE user_id = ?", (user["id"],)
        )
        settings = await settings_row.fetchone()
        base_currency = settings["base_currency"] if settings else "USD"

        async with conn.execute(
            "SELECT currency, invested_amount, current_value, quantity FROM investments WHERE user_id = ?",
            (user["id"],)
        ) as cur:
            rows = await cur.fetchall()

    total_invested = Decimal("0")
    total_current = Decimal("0")
    for row in rows:
        currency = row["currency"] or base_currency
        qty = row["quantity"]
        invested = Decimal(str(row["invested_amount"])) * (Decimal(str(qty)) if qty is not None else Decimal("1"))
        current = Decimal(str(row["current_value"]))
        total_invested += await convert_amount(invested, currency, base_currency)
        total_current += await convert_amount(current, currency, base_currency)

    pl = total_current - total_invested
    pl_percent = float(pl / total_invested * 100) if total_invested > 0 else 0.0

    return {
        "base_currency": base_currency,
        "total_invested": float(total_invested),
        "total_current": float(total_current),
        "profit_loss": float(pl),
        "profit_loss_percent": pl_percent,
    }

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
               current_value, quantity, commission, is_automated, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (investment_id, user["id"], data.name, data.type, data.ticker, data.currency,
             data.invested_amount, data.current_value, data.quantity, data.commission, int(data.is_automated), _now_iso())
        )
        await conn.commit()
        return {"id": investment_id, **data.dict(), "created_at": _now_iso()}

@router.put("/{investment_id}")
async def update_investment(investment_id: str, data: InvestmentUpdate, user: dict = Depends(get_current_user)):
    async with db() as conn:
        await conn.execute(
            """UPDATE investments SET name = ?, type = ?, ticker = ?, currency = ?, invested_amount = ?,
               current_value = ?, quantity = ?, commission = ?, is_automated = ?, updated_at = ?
               WHERE id = ? AND user_id = ?""",
            (data.name, data.type, data.ticker, data.currency, data.invested_amount, data.current_value,
             data.quantity, data.commission, int(data.is_automated), _now_iso(), investment_id, user["id"])
        )
        await conn.commit()
        return {"id": investment_id, **data.dict()}

@router.delete("/{investment_id}")
async def delete_investment(investment_id: str, user: dict = Depends(get_current_user)):
    async with db() as conn:
        await conn.execute("DELETE FROM investments WHERE id = ? AND user_id = ?", (investment_id, user["id"]))
        await conn.commit()
        return {"success": True}
