from decimal import Decimal
from typing import Any, Optional
from fastapi import APIRouter, Depends
from database import db
from dependencies import get_current_user
from services.exchange_rates import convert_amount

router = APIRouter(prefix="/networth", tags=["networth"])

@router.get("")
async def get_net_worth(user: dict = Depends(get_current_user)):
    async with db() as conn:
        settings_row = await conn.execute(
            "SELECT base_currency FROM user_settings WHERE user_id = ?", (user["id"],)
        )
        settings = await settings_row.fetchone()
        base_currency = settings["base_currency"] if settings else "PLN"

        rows = await conn.execute_fetchall(
            """
            SELECT t.type, t.amount, t.currency
            FROM transactions t
            WHERE t.user_id = ?
            """,
            (user["id"],),
        )

    # Compute net worth as cumulative (income - expense) across all history.
    # This intentionally ignores dashboard filters.
    breakdown: dict[str, Decimal] = {}
    total_in_base = Decimal("0")

    for r in rows:
        amt = Decimal(str(r["amount"]))
        cur = r["currency"] or base_currency
        signed = amt if r["type"] == "income" else -amt
        breakdown[cur] = breakdown.get(cur, Decimal("0")) + signed

        converted = await convert_amount(signed, cur, base_currency)
        total_in_base += converted

    # Also compute each currency's value in base currency
    breakdown_in_base: dict[str, Decimal] = {}
    for cur, amt in breakdown.items():
        breakdown_in_base[cur] = await convert_amount(amt, cur, base_currency)

    return {
        "total_net_worth": float(total_in_base),
        "base_currency": base_currency,
        "currency_breakdown": {k: float(v) for k, v in breakdown.items()},
        "currency_breakdown_in_base": {k: float(v) for k, v in breakdown_in_base.items()},
    }


@router.get("/timeseries")
async def get_net_worth_timeseries(
    user: dict = Depends(get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    account_ids: Optional[str] = None,
):
    """
    Returns cumulative net worth over time derived from transactions (income-expense),
    converted into user's base currency. When account_ids is provided, it filters
    transactions by those accounts.
    """
    where = ["t.user_id = ?"]
    args: list[Any] = [user["id"]]
    if start_date:
        where.append("t.date >= ?")
        args.append(start_date)
    if end_date:
        where.append("t.date <= ?")
        args.append(end_date)
    if account_ids:
        ids = [s.strip() for s in account_ids.split(",") if s.strip()]
        if ids:
            where.append(f"t.account_id IN ({','.join(['?'] * len(ids))})")
            args.extend(ids)

    async with db() as conn:
        settings_row = await conn.execute(
            "SELECT base_currency FROM user_settings WHERE user_id = ?", (user["id"],)
        )
        settings = await settings_row.fetchone()
        base_currency = settings["base_currency"] if settings else "PLN"

        rows = await conn.execute_fetchall(
            f"""
            SELECT t.date, t.type, t.amount, t.currency
            FROM transactions t
            WHERE {' AND '.join(where)}
            ORDER BY t.date ASC
            """,
            tuple(args),
        )

    # Aggregate per day (in base currency)
    per_day: dict[str, Decimal] = {}
    for r in rows:
        day = r["date"]
        amt = Decimal(str(r["amount"]))
        cur = r["currency"] or base_currency
        converted = await convert_amount(amt, cur, base_currency)
        signed = converted if r["type"] == "income" else -converted
        per_day[day] = per_day.get(day, Decimal("0")) + signed

    # Build cumulative series
    dates = sorted(per_day.keys())
    running = Decimal("0")
    series = []
    for day in dates:
        running += per_day[day]
        series.append(
            {
                "date": day,
                "net_worth": float(running),
            }
        )

    return {"base_currency": base_currency, "series": series}
