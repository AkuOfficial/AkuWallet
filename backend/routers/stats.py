from typing import Any, Optional

import fastapi

from database import db
from dependencies import get_current_user

router = fastapi.APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
async def get_stats(
    user=fastapi.Depends(get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    where = ["t.user_id = ?"]
    args: list[Any] = [user["id"]]
    if start_date:
        where.append("t.date >= ?")
        args.append(start_date)
    if end_date:
        where.append("t.date <= ?")
        args.append(end_date)

    async with db() as conn:
        rows = await conn.execute_fetchall(
            f"""
            SELECT t.type, t.amount, t.date, c.name AS category_name
            FROM transactions t
            LEFT JOIN categories c ON c.id = t.category_id
            WHERE {' AND '.join(where)}
            """,
            tuple(args),
        )
        transactions = [dict(r) for r in rows]

    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")

    expense_by_category: dict[str, float] = {}
    for t in transactions:
        if t["type"] == "expense" and t.get("category_name"):
            cat = t["category_name"]
            expense_by_category[cat] = expense_by_category.get(cat, 0) + t["amount"]

    by_date: dict[str, dict[str, float]] = {}
    for t in transactions:
        date = t["date"]
        if date not in by_date:
            by_date[date] = {"income": 0, "expense": 0}
        by_date[date][t["type"]] += t["amount"]

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
        "expense_by_category": expense_by_category,
        "by_date": by_date,
        "transaction_count": len(transactions),
    }
