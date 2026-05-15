import secrets
from typing import Any, Optional

import fastapi

from database import db, fetchone
from dependencies import get_current_user
from models import TransactionCreate, TransactionUpdate
from security import _now_iso
from decimal import Decimal
from services.exchange_rates import convert_amount

router = fastapi.APIRouter(prefix="/transactions", tags=["transactions"])


async def _get_investments_category_ids(conn, user_id: str) -> set[str]:
    rows = await conn.execute_fetchall(
        "SELECT id FROM categories WHERE name = 'Investments' AND ((user_id = ?) OR (is_default = 1))",
        (user_id,),
    )
    return {r["id"] for r in rows}


@router.get("")
async def list_transactions(
    user=fastapi.Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
    type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    account_ids: Optional[str] = None,
    category_ids: Optional[str] = None,
):
    where = ["t.user_id = ?"]
    args: list[Any] = [user["id"]]
    if type:
        where.append("t.type = ?")
        args.append(type)
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
    if category_ids:
        ids = [s.strip() for s in category_ids.split(",") if s.strip()]
        if ids:
            where.append(f"t.category_id IN ({','.join(['?'] * len(ids))})")
            args.extend(ids)

    sql = f"""
      SELECT
        t.*,
        c.id AS c_id, c.name AS c_name, c.type AS c_type,
        c.icon AS c_icon, c.color AS c_color, c.is_default AS c_is_default
      FROM transactions t
      LEFT JOIN categories c ON c.id = t.category_id
      WHERE {' AND '.join(where)}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ? OFFSET ?
    """
    args.extend([limit, offset])

    async with db() as conn:
        rows = await conn.execute_fetchall(sql, tuple(args))
        tx_ids = [r["id"] for r in rows]

        tags_by_tx: dict[str, list[dict[str, Any]]] = {}
        if tx_ids:
            placeholders = ",".join("?" for _ in tx_ids)
            tag_rows = await conn.execute_fetchall(
                f"""
                SELECT tt.transaction_id, tg.*
                FROM transaction_tags tt
                JOIN tags tg ON tg.id = tt.tag_id
                WHERE tt.transaction_id IN ({placeholders})
                ORDER BY tg.name
                """,
                tuple(tx_ids),
            )
            for tr in tag_rows:
                tags_by_tx.setdefault(tr["transaction_id"], []).append(
                    {"id": tr["id"], "user_id": tr["user_id"], "name": tr["name"],
                     "color": tr["color"], "created_at": tr["created_at"]}
                )

        out: list[dict[str, Any]] = []
        for r in rows:
            category = None
            if r["c_id"]:
                category = {
                    "id": r["c_id"], "user_id": None, "name": r["c_name"],
                    "type": r["c_type"], "icon": r["c_icon"], "color": r["c_color"],
                    "is_default": bool(r["c_is_default"]), "created_at": None,
                }
            out.append({
                "id": r["id"], "user_id": r["user_id"], "type": r["type"],
                "account_id": r["account_id"], "amount": r["amount"], "currency": r["currency"],
                "description": r["description"],
                "category_id": r["category_id"], "date": r["date"],
                "recurrence": r["recurrence"], "recurrence_end_date": r["recurrence_end_date"],
                "created_at": r["created_at"], "updated_at": r["updated_at"],
                "category": category, "tags": tags_by_tx.get(r["id"], []),
            })
        return out


@router.post("")
async def create_transaction(
    data: TransactionCreate,
    user=fastapi.Depends(get_current_user),
):
    tx_id = secrets.token_hex(16)
    created_at = _now_iso()
    async with db() as conn:
        inv_category_ids = await _get_investments_category_ids(conn, user["id"])
        if data.category_id and data.category_id in inv_category_ids:
            raise fastapi.HTTPException(status_code=400, detail="Investments category can only be created from Investments panel")
        account_id = data.account_id
        if not account_id:
            default_account = await fetchone(
                conn,
                "SELECT id FROM accounts WHERE user_id = ? ORDER BY created_at ASC LIMIT 1",
                (user["id"],),
            )
            account_id = default_account["id"] if default_account else None
        await conn.execute(
            """
            INSERT INTO transactions (
              id, user_id, account_id, type, amount, currency, description, category_id, date,
              recurrence, recurrence_end_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (tx_id, user["id"], account_id, data.type, float(data.amount), data.currency,
             data.description, data.category_id, data.date, data.recurrence, data.recurrence_end_date, created_at),
        )
        for tag_id in data.tag_ids:
            await conn.execute(
                "INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)",
                (tx_id, tag_id),
            )
        await conn.commit()

    return {
        "id": tx_id, "user_id": user["id"], "account_id": account_id, "type": data.type,
        "amount": float(data.amount), "currency": data.currency,
        "description": data.description, "category_id": data.category_id, "date": data.date,
        "recurrence": data.recurrence, "recurrence_end_date": data.recurrence_end_date,
        "created_at": created_at, "updated_at": None,
    }


@router.put("/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    user=fastapi.Depends(get_current_user),
):
    updated_at = _now_iso()
    async with db() as conn:
        existing = await fetchone(
            conn, "SELECT id FROM transactions WHERE id = ? AND user_id = ?",
            (transaction_id, user["id"]),
        )
        if not existing:
            raise fastapi.HTTPException(status_code=404, detail="Transaction not found")

        await conn.execute(
            """
            UPDATE transactions
            SET account_id = ?, type = ?, amount = ?, currency = ?, description = ?, category_id = ?, date = ?,
                recurrence = ?, recurrence_end_date = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (data.account_id, data.type, float(data.amount), data.currency, data.description,
             data.category_id, data.date, data.recurrence, data.recurrence_end_date, updated_at,
             transaction_id, user["id"]),
        )
        tx_row = await fetchone(conn, "SELECT * FROM transactions WHERE id = ? AND user_id = ?", (transaction_id, user["id"]))
        if tx_row and tx_row["linked_investment_id"]:
            inv_id = tx_row["linked_investment_id"]
            qty_sign = 1 if data.type == "expense" else -1
            inv_qty = None
            inv_unit = float(data.amount)
            if tx_row["account_id"]:
                acc = await fetchone(conn, "SELECT currency FROM accounts WHERE id = ? AND user_id = ?", (tx_row["account_id"], user["id"]))
                if acc:
                    inv_unit = float(await convert_amount(Decimal(str(data.amount)), acc["currency"], data.currency))
            await conn.execute(
                """
                UPDATE investments
                SET name = ?, ticker = ?, currency = ?, invested_amount = ?, current_value = ?, quantity = ?, updated_at = ?
                WHERE id = ? AND user_id = ?
                """,
                (data.description or "Investment", None, data.currency, inv_unit, float(data.amount), inv_qty if inv_qty is not None else (1.0 * qty_sign), _now_iso(), inv_id, user["id"]),
            )
        await conn.execute(
            "DELETE FROM transaction_tags WHERE transaction_id = ?", (transaction_id,)
        )
        for tag_id in data.tag_ids:
            await conn.execute(
                "INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)",
                (transaction_id, tag_id),
            )
        await conn.commit()

        row = await fetchone(conn, "SELECT * FROM transactions WHERE id = ?", (transaction_id,))
        return dict(row)


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    user=fastapi.Depends(get_current_user),
):
    async with db() as conn:
        row = await fetchone(conn, "SELECT linked_investment_id FROM transactions WHERE id = ? AND user_id = ?", (transaction_id, user["id"]))
        await conn.execute(
            "DELETE FROM transactions WHERE id = ? AND user_id = ?",
            (transaction_id, user["id"]),
        )
        if row and row["linked_investment_id"]:
            await conn.execute("DELETE FROM investments WHERE id = ? AND user_id = ?", (row["linked_investment_id"], user["id"]))
        await conn.commit()
    return {"success": True}
