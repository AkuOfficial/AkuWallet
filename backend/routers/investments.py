import secrets
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from database import db, fetchone
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

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        if value <= 0:
            raise ValueError("Quantity must be greater than 0")
        quantized = Decimal(str(value)).quantize(Decimal("0.01"))
        if quantized != Decimal(str(value)):
            raise ValueError("Quantity can have at most 2 decimal places")
        return value

    @field_validator("current_value")
    @classmethod
    def validate_current_value(cls, value: float) -> float:
        if value < 0:
            raise ValueError("Value must be greater than or equal to 0")
        quantized = Decimal(str(value)).quantize(Decimal("0.01"))
        if quantized != Decimal(str(value)):
            raise ValueError("Value can have at most 2 decimal places")
        return value

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
    linked_account_id: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        if value <= 0:
            raise ValueError("Quantity must be greater than 0")
        quantized = Decimal(str(value)).quantize(Decimal("0.01"))
        if quantized != Decimal(str(value)):
            raise ValueError("Quantity can have at most 2 decimal places")
        return value

    @field_validator("current_value")
    @classmethod
    def validate_current_value(cls, value: float) -> float:
        if value < 0:
            raise ValueError("Value must be greater than or equal to 0")
        quantized = Decimal(str(value)).quantize(Decimal("0.01"))
        if quantized != Decimal(str(value)):
            raise ValueError("Value can have at most 2 decimal places")
        return value

class InvestmentSell(BaseModel):
    account_id: str
    quantity: float
    price: float
    commission: float = 0.0
    currency: Optional[str] = None

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, value: float) -> float:
        if value <= 0:
            raise ValueError("Quantity must be greater than 0")
        quantized = Decimal(str(value)).quantize(Decimal("0.01"))
        if quantized != Decimal(str(value)):
            raise ValueError("Quantity can have at most 2 decimal places")
        return value


async def _get_investments_category_id(conn, user_id: str, tx_type: str) -> str:
    row = await fetchone(
        conn,
        "SELECT id FROM categories WHERE name = ? AND type = ? AND ((user_id = ?) OR (is_default = 1)) ORDER BY is_default ASC LIMIT 1",
        ("Investments", tx_type, user_id),
    )
    if not row:
        raise HTTPException(status_code=500, detail=f"Investments {tx_type} category not found")
    return row["id"]

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
async def list_investments(show_history: bool = False, user: dict = Depends(get_current_user)):
    async with db() as conn:
        async with conn.execute(
            "SELECT * FROM investments WHERE user_id = ? ORDER BY created_at ASC",
            (user["id"],)
        ) as cur:
            rows = await cur.fetchall()
            grouped: dict[tuple[str, str, str, str, str], list[dict]] = {}
            for row in rows:
                item = dict(row)
                key = (
                    item["name"],
                    item["type"],
                    item["ticker"] or "",
                    item["currency"],
                    item["linked_account_id"] or "",
                )
                grouped.setdefault(key, []).append(item)

            active: list[dict] = []
            for items in grouped.values():
                running_qty = 0.0
                last_flat_index = -1
                for idx, item in enumerate(items):
                    running_qty += float(item["quantity"]) if item["quantity"] is not None else 1.0
                    if running_qty <= 0:
                        last_flat_index = idx
                cycle = items[last_flat_index + 1 :]
                cycle_qty = sum(float(i["quantity"]) if i["quantity"] is not None else 1.0 for i in cycle)
                if cycle_qty > 0:
                    active.extend(cycle)

            if show_history:
                all_rows = [dict(r) for r in rows]
                all_rows.sort(key=lambda x: x["created_at"], reverse=True)
                return all_rows

            active.sort(key=lambda x: x["created_at"], reverse=True)
            return active

@router.post("")
async def create_investment(data: InvestmentCreate, user: dict = Depends(get_current_user)):
    async with db() as conn:
        now = _now_iso()
        investment_id = secrets.token_hex(16)
        created_transaction_id: str | None = None
        await conn.execute(
            """INSERT INTO investments (id, user_id, name, type, ticker, currency, invested_amount, 
               current_value, quantity, commission, linked_account_id, is_automated, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (investment_id, user["id"], data.name, data.type, data.ticker, data.currency,
             data.invested_amount, data.current_value, data.quantity, data.commission, data.linked_account_id, int(data.is_automated), now)
        )

        linked_account_id = data.linked_account_id
        if not linked_account_id:
            default_account = await fetchone(
                conn,
                "SELECT id FROM accounts WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
                (user["id"],),
            )
            linked_account_id = default_account["id"] if default_account else None

        if linked_account_id:
            account = await fetchone(
                conn,
                "SELECT id, currency FROM accounts WHERE id = ? AND user_id = ?",
                (linked_account_id, user["id"]),
            )
            if not account:
                raise HTTPException(status_code=400, detail="Linked account not found for investment purchase transaction")

            qty = data.quantity if data.quantity is not None else 1.0
            gross = Decimal(str(data.invested_amount)) * Decimal(str(qty))
            total = gross + Decimal(str(data.commission or 0))
            tx_amount = await convert_amount(total, data.currency, account["currency"])

            category_id = await _get_investments_category_id(conn, user["id"], "expense")

            await conn.execute(
                """
                INSERT INTO transactions (
                  id, user_id, account_id, type, amount, currency, description, category_id, date,
                  recurrence, recurrence_end_date, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    (created_transaction_id := secrets.token_hex(16)), user["id"], account["id"], "expense", float(tx_amount), account["currency"],
                    f"Purchase: {data.name} ({(data.ticker or '').upper() or '-'})", category_id, now.split("T")[0], "none", None, now
                ),
            )
            await conn.execute(
                "UPDATE investments SET linked_transaction_id = ? WHERE id = ? AND user_id = ?",
                (created_transaction_id, investment_id, user["id"]),
            )
            await conn.execute(
                "UPDATE transactions SET linked_investment_id = ? WHERE id = ? AND user_id = ?",
                (investment_id, created_transaction_id, user["id"]),
            )
        await conn.commit()
        return {"id": investment_id, "transaction_id": created_transaction_id, **data.dict(), "created_at": now}

@router.post("/{investment_id}/sell")
async def sell_investment(investment_id: str, data: InvestmentSell, user: dict = Depends(get_current_user)):
    async with db() as conn:
        now = _now_iso()
        created_transaction_id = secrets.token_hex(16)
        inv = await fetchone(
            conn,
            "SELECT * FROM investments WHERE id = ? AND user_id = ?",
            (investment_id, user["id"]),
        )
        if not inv:
            raise HTTPException(status_code=404, detail="Investment not found")
        if data.quantity <= 0 or data.price <= 0:
            raise HTTPException(status_code=400, detail="Quantity and price must be greater than 0")
        # Validate against total net quantity of the whole asset position (all buys/sells),
        # not just the single row selected in UI.
        async with conn.execute(
            """
            SELECT COALESCE(SUM(COALESCE(quantity, 1)), 0) AS total_qty
            FROM investments
            WHERE user_id = ?
              AND name = ?
              AND type = ?
              AND COALESCE(ticker, '') = COALESCE(?, '')
              AND currency = ?
              AND COALESCE(linked_account_id, '') = COALESCE(?, '')
            """,
            (user["id"], inv["name"], inv["type"], inv["ticker"], inv["currency"], inv["linked_account_id"]),
        ) as cur:
            qty_row = await cur.fetchone()
        available_qty_dec = Decimal(str(qty_row["total_qty"] if qty_row and qty_row["total_qty"] is not None else 0)).quantize(Decimal("0.01"))
        sell_qty_dec = Decimal(str(data.quantity)).quantize(Decimal("0.01"))
        if sell_qty_dec > available_qty_dec:
            raise HTTPException(status_code=400, detail="Cannot sell more than current quantity")

        account = await fetchone(
            conn,
            "SELECT id, currency FROM accounts WHERE id = ? AND user_id = ?",
            (data.account_id, user["id"]),
        )
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        sale_currency = data.currency or inv["currency"]
        gross = Decimal(str(data.price)) * Decimal(str(data.quantity))
        net = gross - Decimal(str(data.commission or 0))
        tx_amount = await convert_amount(net, sale_currency, account["currency"])

        income_category_id = await _get_investments_category_id(conn, user["id"], "income")

        await conn.execute(
            """
            INSERT INTO transactions (
              id, user_id, account_id, type, amount, currency, description, category_id, date,
              recurrence, recurrence_end_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                created_transaction_id, user["id"], account["id"], "income", float(tx_amount), account["currency"],
                f"Sell: {inv['name']} ({(inv['ticker'] or '').upper() or '-'})", income_category_id, now.split("T")[0], "none", None, now
            ),
        )

        sell_inv_id = secrets.token_hex(16)
        await conn.execute(
            """INSERT INTO investments (id, user_id, name, type, ticker, currency, invested_amount,
               current_value, quantity, commission, linked_account_id, linked_transaction_id, is_automated, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                sell_inv_id, user["id"], inv["name"], inv["type"], inv["ticker"], sale_currency,
                data.price, -abs(data.price * data.quantity - data.commission), -abs(data.quantity), data.commission, data.account_id, created_transaction_id, 0, now
            ),
        )
        await conn.execute(
            "UPDATE transactions SET linked_investment_id = ? WHERE id = ? AND user_id = ?",
            (sell_inv_id, created_transaction_id, user["id"]),
        )
        await conn.commit()
        return {"success": True, "transaction_id": created_transaction_id}

@router.put("/{investment_id}")
async def update_investment(investment_id: str, data: InvestmentUpdate, user: dict = Depends(get_current_user)):
    async with db() as conn:
        await conn.execute(
            """UPDATE investments SET name = ?, type = ?, ticker = ?, currency = ?, invested_amount = ?,
               current_value = ?, quantity = ?, commission = ?, linked_account_id = ?, is_automated = ?, updated_at = ?
               WHERE id = ? AND user_id = ?""",
            (data.name, data.type, data.ticker, data.currency, data.invested_amount, data.current_value,
             data.quantity, data.commission, data.linked_account_id, int(data.is_automated), _now_iso(), investment_id, user["id"])
        )
        if data.linked_account_id:
            account = await fetchone(
                conn,
                "SELECT id, currency FROM accounts WHERE id = ? AND user_id = ?",
                (data.linked_account_id, user["id"]),
            )
            if not account:
                raise HTTPException(status_code=400, detail="Linked account not found")
        existing = await fetchone(conn, "SELECT linked_transaction_id FROM investments WHERE id = ? AND user_id = ?", (investment_id, user["id"]))
        if existing and existing["linked_transaction_id"]:
            tx_id = existing["linked_transaction_id"]
            tx_row = await fetchone(conn, "SELECT id, currency, account_id, type FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user["id"]))
            if tx_row:
                account_currency = tx_row["currency"]
                account_id = tx_row["account_id"]
                if data.linked_account_id:
                    account_row = await fetchone(conn, "SELECT id, currency FROM accounts WHERE id = ? AND user_id = ?", (data.linked_account_id, user["id"]))
                    if account_row:
                        account_id = account_row["id"]
                        account_currency = account_row["currency"]
                qty = data.quantity if data.quantity is not None else 1.0
                gross = Decimal(str(data.invested_amount)) * Decimal(str(qty))
                total = gross + Decimal(str(data.commission or 0))
                tx_amount = await convert_amount(total, data.currency, account_currency)
                tx_type = "expense" if data.quantity is None or data.quantity >= 0 else "income"
                category_id = await _get_investments_category_id(conn, user["id"], tx_type)
                description_prefix = "Purchase" if tx_type == "expense" else "Sell"
                await conn.execute(
                    """
                    UPDATE transactions
                    SET account_id = ?, type = ?, amount = ?, currency = ?, description = ?, category_id = ?, date = ?, updated_at = ?
                    WHERE id = ? AND user_id = ?
                    """,
                    (account_id, tx_type, float(tx_amount), account_currency, f"{description_prefix}: {data.name} ({(data.ticker or '').upper() or '-'})", category_id, _now_iso().split("T")[0], _now_iso(), tx_id, user["id"]),
                )
        await conn.commit()
        return {"id": investment_id, **data.dict()}

@router.delete("/{investment_id}")
async def delete_investment(investment_id: str, user: dict = Depends(get_current_user)):
    async with db() as conn:
        row = await fetchone(conn, "SELECT linked_transaction_id FROM investments WHERE id = ? AND user_id = ?", (investment_id, user["id"]))
        await conn.execute("DELETE FROM investments WHERE id = ? AND user_id = ?", (investment_id, user["id"]))
        if row and row["linked_transaction_id"]:
            await conn.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (row["linked_transaction_id"], user["id"]))
        await conn.commit()
        return {"success": True}
