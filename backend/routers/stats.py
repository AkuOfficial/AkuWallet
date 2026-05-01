from decimal import Decimal
from typing import Any, Optional

import fastapi

from database import db
from dependencies import get_current_user
from services.exchange_rates import convert_amount

router = fastapi.APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
async def get_stats(
    user=fastapi.Depends(get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    account_ids: Optional[str] = None,
):
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
            SELECT t.type, t.amount, t.currency, t.date, c.name AS category_name
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id
            WHERE {' AND '.join(where)}
            """,
            tuple(args),
        )
        transactions = [dict(r) for r in rows]

    total_income = Decimal("0")
    total_expense = Decimal("0")
    expense_by_category: dict[str, float] = {}
    income_by_category: dict[str, float] = {}
    by_date: dict[str, dict[str, float]] = {}

    for t in transactions:
        cur = t.get("currency") or base_currency
        amt_base = await convert_amount(Decimal(str(t["amount"])), cur, base_currency)
        amt_f = float(amt_base)

        cat = t.get("category_name") or "Uncategorized"
        if t["type"] == "income":
            total_income += amt_base
            income_by_category[cat] = income_by_category.get(cat, 0) + amt_f
        else:
            total_expense += amt_base
            expense_by_category[cat] = expense_by_category.get(cat, 0) + amt_f

        date = t["date"]
        if date not in by_date:
            by_date[date] = {"income": 0, "expense": 0}
        by_date[date][t["type"]] += amt_f

    return {
        "total_income": float(total_income),
        "total_expense": float(total_expense),
        "balance": float(total_income - total_expense),
        "base_currency": base_currency,
        "expense_by_category": expense_by_category,
        "income_by_category": income_by_category,
        "by_date": by_date,
        "transaction_count": len(transactions),
    }
