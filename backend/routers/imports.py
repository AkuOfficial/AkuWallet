import secrets

import fastapi

from database import db
from dependencies import get_current_user
from models import ImportedTransaction
from security import _now_iso

router = fastapi.APIRouter(prefix="/import", tags=["import"])


@router.post("")
async def import_transactions(
    transactions: list[ImportedTransaction],
    user=fastapi.Depends(get_current_user),
):
    async with db() as conn:
        rows = await conn.execute_fetchall(
            "SELECT * FROM categories WHERE (user_id = ?) OR (is_default = 1)",
            (user["id"],),
        )
        categories = [dict(r) for r in rows]

        results: dict = {"success": 0, "failed": 0, "errors": []}
        for tx in transactions:
            category_id = None
            if tx.category and categories:
                matched = next(
                    (c for c in categories
                     if c["name"].lower() == tx.category.lower() and c["type"] == tx.type),
                    None,
                )
                category_id = matched["id"] if matched else None

            try:
                tx_id = secrets.token_hex(16)
                await conn.execute(
                    """
                    INSERT INTO transactions (
                      id, user_id, type, amount, description, category_id,
                      date, recurrence, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'none', ?)
                    """,
                    (tx_id, user["id"], tx.type, float(tx.amount),
                     tx.description, category_id, tx.date, _now_iso()),
                )
                results["success"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"Failed to import: {tx.description} - {str(e)}")

        await conn.commit()
        return results
