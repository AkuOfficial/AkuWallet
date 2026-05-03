import secrets
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from database import db
from dependencies import get_current_user
from security import _now_iso
from services.exchange_rates import convert_amount
from services.market_prices import get_ticker_price, get_ticker_info

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
    linked_account_id: Optional[str] = None

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

class InvestmentSell(BaseModel):
    account_id: str
    quantity: float
    price: float
    commission: float = 0.0
    currency: Optional[str] = None

@router.get("/price/{ticker}")
async def get_investment_price(ticker: str, _: dict = Depends(get_current_user)):
    info = await get_ticker_info(ticker.upper())
    if info is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Price not found")
    return {"ticker": ticker.upper(), **info}

@router.get("/summary")
async def get_investments_summary(user: dict = Depends(get_current_user)):
    async with db() as conn:
        settings_row = await conn.execute(
            "SELECT base_currency FROM user_settings WHERE user_id = ?", (user["id"],)
        )
        settings = await settings_row.fetchone()
        base_currency = settings["base_currency"] if settings else "USD"

        async with conn.execute(
            "SELECT currency, invested_amount, current_value, quantity, commission FROM investments WHERE user_id = ?",
            (user["id"],)
        ) as cur:
            rows = await cur.fetchall()

    total_invested = Decimal("0")
    total_current = Decimal("0")
    for row in rows:
        currency = row["currency"] or base_currency
        qty = row["quantity"]
        commission = Decimal(str(row["commission"] or 0))
        invested = Decimal(str(row["invested_amount"])) * (Decimal(str(qty)) if qty is not None else Decimal("1"))
        current = Decimal(str(row["current_value"]))
        total_invested += await convert_amount(invested, currency, base_currency)
        total_current += await convert_amount(current - commission, currency, base_currency)

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
        now = _now_iso()
        investment_id = secrets.token_hex(16)
        await conn.execute(
            """INSERT INTO investments (id, user_id, name, type, ticker, currency, invested_amount, 
               current_value, quantity, commission, is_automated, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (investment_id, user["id"], data.name, data.type, data.ticker, data.currency,
             data.invested_amount, data.current_value, data.quantity, data.commission, int(data.is_automated), now)
        )

        linked_account_id = data.linked_account_id
        if not linked_account_id:
            default_account = await conn.execute_fetchone(
                "SELECT id FROM accounts WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
                (user["id"],),
            )
            linked_account_id = default_account["id"] if default_account else None

        if linked_account_id:
            account = await conn.execute_fetchone(
                "SELECT id, currency FROM accounts WHERE id = ? AND user_id = ?",
                (linked_account_id, user["id"]),
            )
            if account:
                qty = data.quantity if data.quantity is not None else 1.0
                gross = Decimal(str(data.invested_amount)) * Decimal(str(qty))
                total = gross + Decimal(str(data.commission or 0))
                tx_amount = await convert_amount(total, data.currency, account["currency"])

                category = await conn.execute_fetchone(
                    "SELECT id FROM categories WHERE name = ? AND type = ? AND ((user_id = ?) OR (is_default = 1)) ORDER BY is_default ASC LIMIT 1",
                    ("Investment", "expense", user["id"]),
                )
                category_id = category["id"] if category else None

                await conn.execute(
                    """
                    INSERT INTO transactions (
                      id, user_id, account_id, type, amount, currency, description, category_id, date,
                      recurrence, recurrence_end_date, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        secrets.token_hex(16), user["id"], account["id"], "expense", float(tx_amount), account["currency"],
                        f"Purchase: {data.name} ({(data.ticker or '').upper() or '-'})", category_id, now.split("T")[0], "none", None, now
                    ),
                )
        await conn.commit()
        return {"id": investment_id, **data.dict(), "created_at": now}

@router.post("/{investment_id}/sell")
async def sell_investment(investment_id: str, data: InvestmentSell, user: dict = Depends(get_current_user)):
    async with db() as conn:
        now = _now_iso()
        inv = await conn.execute_fetchone(
            "SELECT * FROM investments WHERE id = ? AND user_id = ?",
            (investment_id, user["id"]),
        )
        if not inv:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Investment not found")
        if data.quantity <= 0 or data.price <= 0:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Quantity and price must be greater than 0")

        account = await conn.execute_fetchone(
            "SELECT id, currency FROM accounts WHERE id = ? AND user_id = ?",
            (data.account_id, user["id"]),
        )
        if not account:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Account not found")

        sale_currency = data.currency or inv["currency"]
        gross = Decimal(str(data.price)) * Decimal(str(data.quantity))
        net = gross - Decimal(str(data.commission or 0))
        tx_amount = await convert_amount(net, sale_currency, account["currency"])

        income_category = await conn.execute_fetchone(
            "SELECT id FROM categories WHERE name = ? AND type = ? AND ((user_id = ?) OR (is_default = 1)) ORDER BY is_default ASC LIMIT 1",
            ("Investments", "income", user["id"]),
        )

        await conn.execute(
            """
            INSERT INTO transactions (
              id, user_id, account_id, type, amount, currency, description, category_id, date,
              recurrence, recurrence_end_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                secrets.token_hex(16), user["id"], account["id"], "income", float(tx_amount), account["currency"],
                f"Sell: {inv['name']} ({(inv['ticker'] or '').upper() or '-'})", income_category["id"] if income_category else None, now.split("T")[0], "none", None, now
            ),
        )

        await conn.execute(
            """INSERT INTO investments (id, user_id, name, type, ticker, currency, invested_amount,
               current_value, quantity, commission, is_automated, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                secrets.token_hex(16), user["id"], inv["name"], inv["type"], inv["ticker"], sale_currency,
                data.price, -abs(data.price * data.quantity - data.commission), -abs(data.quantity), data.commission, 0, now
            ),
        )
        await conn.commit()
        return {"success": True}

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
