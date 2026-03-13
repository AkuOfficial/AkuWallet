import os
import secrets
import hashlib
import hmac
from typing import Optional, Any, Sequence
from datetime import datetime, timezone
from contextlib import asynccontextmanager

import fastapi
import fastapi.middleware.cors
from pydantic import BaseModel
import aiosqlite

# from supabase import acreate_client, AsyncClient  # TEMP: disabled while using local SQLite

async def fetchone(
    conn: aiosqlite.Connection,
    sql: str,
    params: Sequence[Any] | None = None,
) -> aiosqlite.Row | None:
    async with conn.execute(sql, params or ()) as cur:
        return await cur.fetchone()


@asynccontextmanager
async def lifespan(_: fastapi.FastAPI):
    async with db() as conn:
        await conn.executescript(
            """
            PRAGMA journal_mode=WAL;
            PRAGMA foreign_keys=ON;

            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              email TEXT UNIQUE NOT NULL,
              password_hash TEXT NOT NULL,
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sessions (
              token TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS categories (
              id TEXT PRIMARY KEY,
              user_id TEXT,
              name TEXT NOT NULL,
              type TEXT NOT NULL,
              icon TEXT,
              color TEXT,
              is_default INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS tags (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              name TEXT NOT NULL,
              color TEXT,
              created_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS transactions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              type TEXT NOT NULL,
              amount REAL NOT NULL,
              description TEXT,
              category_id TEXT,
              date TEXT NOT NULL,
              recurrence TEXT NOT NULL DEFAULT 'none',
              recurrence_end_date TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT,
              FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
              FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS transaction_tags (
              transaction_id TEXT NOT NULL,
              tag_id TEXT NOT NULL,
              PRIMARY KEY (transaction_id, tag_id),
              FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
              FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS goals (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              name TEXT NOT NULL,
              target_amount REAL NOT NULL,
              current_amount REAL NOT NULL DEFAULT 0,
              deadline TEXT,
              created_at TEXT NOT NULL,
              updated_at TEXT,
              FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )

        # Seed defaults (shared across all users)
        existing = await fetchone(conn, "SELECT COUNT(1) AS c FROM categories WHERE is_default = 1")
        if (existing["c"] if existing else 0) == 0:
            for c in DEFAULT_CATEGORIES:
                await conn.execute(
                    """
                    INSERT INTO categories (id, user_id, name, type, icon, color, is_default, created_at)
                    VALUES (?, NULL, ?, ?, ?, ?, 1, ?)
                    """,
                    (secrets.token_hex(16), c["name"], c["type"], c.get("icon"), c.get("color"), _now_iso()),
                )
        await conn.commit()

    yield


app = fastapi.FastAPI(lifespan=lifespan)

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# TEMP LOCAL DATABASE (SQLite)
# -----------------------------

DB_PATH = os.environ.get("LOCAL_DB_PATH") or os.path.join(os.path.dirname(__file__), "local.db")


@asynccontextmanager
async def db():
    conn = await aiosqlite.connect(DB_PATH)
    conn.row_factory = aiosqlite.Row
    try:
        yield conn
    finally:
        await conn.close()


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _pbkdf2_hash(password: str, *, salt: bytes) -> str:
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210_000)
    return dk.hex()


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = _pbkdf2_hash(password, salt=salt)
    return f"pbkdf2_sha256${salt.hex()}${digest}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        algo, salt_hex, digest_hex = stored.split("$", 2)
        if algo != "pbkdf2_sha256":
            return False
        salt = bytes.fromhex(salt_hex)
        computed = _pbkdf2_hash(password, salt=salt)
        return hmac.compare_digest(computed, digest_hex)
    except Exception:
        return False


DEFAULT_CATEGORIES: list[dict[str, Any]] = [
    # Expenses
    {"name": "Food", "type": "expense", "icon": "Utensils", "color": "#EF4444"},
    {"name": "Transport", "type": "expense", "icon": "Car", "color": "#F97316"},
    {"name": "Shopping", "type": "expense", "icon": "ShoppingBag", "color": "#A855F7"},
    {"name": "Bills", "type": "expense", "icon": "Receipt", "color": "#3B82F6"},
    {"name": "Health", "type": "expense", "icon": "HeartPulse", "color": "#22C55E"},
    {"name": "Entertainment", "type": "expense", "icon": "Film", "color": "#06B6D4"},
    # Income
    {"name": "Salary", "type": "income", "icon": "Briefcase", "color": "#22C55E"},
    {"name": "Bonus", "type": "income", "icon": "Sparkles", "color": "#84CC16"},
    {"name": "Other Income", "type": "income", "icon": "Plus", "color": "#10B981"},
]


# Pydantic models
class TransactionCreate(BaseModel):
    type: str  # 'income' or 'expense'
    amount: float
    description: Optional[str] = None
    category_id: Optional[str] = None
    date: str
    recurrence: str = "none"
    recurrence_end_date: Optional[str] = None
    tag_ids: list[str] = []


class TransactionUpdate(BaseModel):
    type: str
    amount: float
    description: Optional[str] = None
    category_id: Optional[str] = None
    date: str
    recurrence: str = "none"
    recurrence_end_date: Optional[str] = None
    tag_ids: list[str] = []


class CategoryCreate(BaseModel):
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None


class TagCreate(BaseModel):
    name: str
    color: Optional[str] = None


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0
    deadline: Optional[str] = None


class GoalUpdate(BaseModel):
    name: str
    target_amount: float
    current_amount: float
    deadline: Optional[str] = None


class ImportedTransaction(BaseModel):
    type: str
    amount: float
    description: Optional[str] = None
    category: Optional[str] = None
    date: str


class SuggestCategoryItem(BaseModel):
    description: str
    type: str


class SuggestCategoryCategory(BaseModel):
    name: str
    type: str


class SuggestCategoryRequest(BaseModel):
    transactions: list[SuggestCategoryItem]
    categories: list[SuggestCategoryCategory]


# Helper to get user from auth header
async def get_current_user(authorization: str = fastapi.Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise fastapi.HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1].strip()
    async with db() as conn:
        row = await fetchone(
            conn,
            """
            SELECT u.id, u.email, u.created_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            """,
            (token,),
        )
        if not row:
            raise fastapi.HTTPException(status_code=401, detail="Invalid token")
        return {"id": row["id"], "email": row["email"], "created_at": row["created_at"]}


class AuthRequest(BaseModel):
    email: str
    password: str


@app.post("/auth/signup")
async def auth_signup(data: AuthRequest):
    user_id = secrets.token_hex(16)
    pw_hash = _hash_password(data.password)
    async with db() as conn:
        try:
            await conn.execute(
                "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (user_id, data.email.lower().strip(), pw_hash, _now_iso()),
            )
            await conn.commit()
        except Exception:
            raise fastapi.HTTPException(status_code=400, detail="Email already registered")
    return {"success": True}


@app.post("/auth/login")
async def auth_login(data: AuthRequest):
    async with db() as conn:
        row = await fetchone(
            conn,
            "SELECT id, email, password_hash FROM users WHERE email = ?",
            (data.email.lower().strip(),),
        )
        if not row or not _verify_password(data.password, row["password_hash"]):
            raise fastapi.HTTPException(status_code=401, detail="Invalid credentials")

        token = secrets.token_urlsafe(32)
        await conn.execute(
            "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
            (token, row["id"], _now_iso()),
        )
        await conn.commit()
        return {"token": token, "user": {"id": row["id"], "email": row["email"]}}


@app.get("/auth/me")
async def auth_me(user=fastapi.Depends(get_current_user)):
    return {"user": user}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


# TRANSACTIONS
@app.get("/transactions")
async def list_transactions(
    user=fastapi.Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
    type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
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

    sql = f"""
      SELECT
        t.*,
        c.id AS c_id, c.name AS c_name, c.type AS c_type, c.icon AS c_icon, c.color AS c_color, c.is_default AS c_is_default
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
                    {"id": tr["id"], "user_id": tr["user_id"], "name": tr["name"], "color": tr["color"], "created_at": tr["created_at"]}
                )

        out: list[dict[str, Any]] = []
        for r in rows:
            category = None
            if r["c_id"]:
                category = {
                    "id": r["c_id"],
                    "user_id": None,
                    "name": r["c_name"],
                    "type": r["c_type"],
                    "icon": r["c_icon"],
                    "color": r["c_color"],
                    "is_default": bool(r["c_is_default"]),
                    "created_at": None,
                }
            out.append(
                {
                    "id": r["id"],
                    "user_id": r["user_id"],
                    "type": r["type"],
                    "amount": r["amount"],
                    "description": r["description"],
                    "category_id": r["category_id"],
                    "date": r["date"],
                    "recurrence": r["recurrence"],
                    "recurrence_end_date": r["recurrence_end_date"],
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"],
                    "category": category,
                    "tags": tags_by_tx.get(r["id"], []),
                }
            )
        return out


@app.post("/transactions")
async def create_transaction(
    data: TransactionCreate,
    user=fastapi.Depends(get_current_user),
):
    tx_id = secrets.token_hex(16)
    created_at = _now_iso()
    async with db() as conn:
        await conn.execute(
            """
            INSERT INTO transactions (
              id, user_id, type, amount, description, category_id, date,
              recurrence, recurrence_end_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                tx_id,
                user["id"],
                data.type,
                float(data.amount),
                data.description,
                data.category_id,
                data.date,
                data.recurrence,
                data.recurrence_end_date,
                created_at,
            ),
        )
        if data.tag_ids:
            for tag_id in data.tag_ids:
                await conn.execute(
                    "INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)",
                    (tx_id, tag_id),
                )
        await conn.commit()

    return {
        "id": tx_id,
        "user_id": user["id"],
        "type": data.type,
        "amount": float(data.amount),
        "description": data.description,
        "category_id": data.category_id,
        "date": data.date,
        "recurrence": data.recurrence,
        "recurrence_end_date": data.recurrence_end_date,
        "created_at": created_at,
        "updated_at": None,
    }


@app.put("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    user=fastapi.Depends(get_current_user),
):
    updated_at = _now_iso()
    async with db() as conn:
        existing = await fetchone(
            conn,
            "SELECT id FROM transactions WHERE id = ? AND user_id = ?",
            (transaction_id, user["id"]),
        )
        if not existing:
            raise fastapi.HTTPException(status_code=404, detail="Transaction not found")

        await conn.execute(
            """
            UPDATE transactions
            SET type = ?, amount = ?, description = ?, category_id = ?, date = ?,
                recurrence = ?, recurrence_end_date = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (
                data.type,
                float(data.amount),
                data.description,
                data.category_id,
                data.date,
                data.recurrence,
                data.recurrence_end_date,
                updated_at,
                transaction_id,
                user["id"],
            ),
        )

        await conn.execute(
            "DELETE FROM transaction_tags WHERE transaction_id = ?",
            (transaction_id,),
        )
        if data.tag_ids:
            for tag_id in data.tag_ids:
                await conn.execute(
                    "INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)",
                    (transaction_id, tag_id),
                )
        await conn.commit()

        row = await fetchone(conn, "SELECT * FROM transactions WHERE id = ?", (transaction_id,))
        return dict(row)


@app.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    user=fastapi.Depends(get_current_user),
):
    async with db() as conn:
        await conn.execute(
            "DELETE FROM transactions WHERE id = ? AND user_id = ?",
            (transaction_id, user["id"]),
        )
        await conn.commit()
    return {"success": True}


# CATEGORIES
@app.get("/categories")
async def list_categories(user=fastapi.Depends(get_current_user)):
    async with db() as conn:
        rows = await conn.execute_fetchall(
            """
            SELECT * FROM categories
            WHERE (user_id = ?) OR (is_default = 1)
            ORDER BY name
            """,
            (user["id"],),
        )
        return [dict(r) for r in rows]


@app.post("/categories")
async def create_category(
    data: CategoryCreate,
    user=fastapi.Depends(get_current_user),
):
    cat_id = secrets.token_hex(16)
    created_at = _now_iso()
    async with db() as conn:
        await conn.execute(
            """
            INSERT INTO categories (id, user_id, name, type, icon, color, is_default, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (cat_id, user["id"], data.name, data.type, data.icon, data.color, created_at),
        )
        await conn.commit()
    return {
        "id": cat_id,
        "user_id": user["id"],
        "name": data.name,
        "type": data.type,
        "icon": data.icon,
        "color": data.color,
        "is_default": False,
        "created_at": created_at,
    }


@app.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    user=fastapi.Depends(get_current_user),
):
    async with db() as conn:
        await conn.execute(
            """
            DELETE FROM categories
            WHERE id = ? AND user_id = ? AND is_default = 0
            """,
            (category_id, user["id"]),
        )
        await conn.commit()
    return {"success": True}


# TAGS
@app.get("/tags")
async def list_tags(user=fastapi.Depends(get_current_user)):
    async with db() as conn:
        rows = await conn.execute_fetchall(
            "SELECT * FROM tags WHERE user_id = ? ORDER BY name",
            (user["id"],),
        )
        return [dict(r) for r in rows]


@app.post("/tags")
async def create_tag(
    data: TagCreate,
    user=fastapi.Depends(get_current_user),
):
    tag_id = secrets.token_hex(16)
    created_at = _now_iso()
    async with db() as conn:
        await conn.execute(
            """
            INSERT INTO tags (id, user_id, name, color, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (tag_id, user["id"], data.name, data.color, created_at),
        )
        await conn.commit()
    return {
        "id": tag_id,
        "user_id": user["id"],
        "name": data.name,
        "color": data.color,
        "created_at": created_at,
    }


@app.delete("/tags/{tag_id}")
async def delete_tag(
    tag_id: str,
    user=fastapi.Depends(get_current_user),
):
    async with db() as conn:
        await conn.execute(
            "DELETE FROM tags WHERE id = ? AND user_id = ?",
            (tag_id, user["id"]),
        )
        await conn.commit()
    return {"success": True}


# GOALS
@app.get("/goals")
async def list_goals(user=fastapi.Depends(get_current_user)):
    async with db() as conn:
        rows = await conn.execute_fetchall(
            "SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],),
        )
        return [dict(r) for r in rows]


@app.post("/goals")
async def create_goal(
    data: GoalCreate,
    user=fastapi.Depends(get_current_user),
):
    goal_id = secrets.token_hex(16)
    created_at = _now_iso()
    async with db() as conn:
        await conn.execute(
            """
            INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (goal_id, user["id"], data.name, float(data.target_amount), float(data.current_amount), data.deadline, created_at),
        )
        await conn.commit()
    return {
        "id": goal_id,
        "user_id": user["id"],
        "name": data.name,
        "target_amount": float(data.target_amount),
        "current_amount": float(data.current_amount),
        "deadline": data.deadline,
        "created_at": created_at,
        "updated_at": None,
    }


@app.put("/goals/{goal_id}")
async def update_goal(
    goal_id: str,
    data: GoalUpdate,
    user=fastapi.Depends(get_current_user),
):
    updated_at = _now_iso()
    async with db() as conn:
        existing = await fetchone(
            conn,
            "SELECT id FROM goals WHERE id = ? AND user_id = ?",
            (goal_id, user["id"]),
        )
        if not existing:
            raise fastapi.HTTPException(status_code=404, detail="Goal not found")
        await conn.execute(
            """
            UPDATE goals
            SET name = ?, target_amount = ?, current_amount = ?, deadline = ?, updated_at = ?
            WHERE id = ? AND user_id = ?
            """,
            (data.name, float(data.target_amount), float(data.current_amount), data.deadline, updated_at, goal_id, user["id"]),
        )
        await conn.commit()
        row = await fetchone(conn, "SELECT * FROM goals WHERE id = ?", (goal_id,))
        return dict(row)


@app.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: str,
    user=fastapi.Depends(get_current_user),
):
    async with db() as conn:
        await conn.execute(
            "DELETE FROM goals WHERE id = ? AND user_id = ?",
            (goal_id, user["id"]),
        )
        await conn.commit()
    return {"success": True}


# IMPORT
@app.post("/import")
async def import_transactions(
    transactions: list[ImportedTransaction],
    user=fastapi.Depends(get_current_user),
):
    async with db() as conn:
        categories = await conn.execute_fetchall(
            "SELECT * FROM categories WHERE (user_id = ?) OR (is_default = 1)",
            (user["id"],),
        )
        categories = [dict(r) for r in categories]

    results = {"success": 0, "failed": 0, "errors": []}
    
    for tx in transactions:
        # Try to match category by name
        category_id = None
        if tx.category and categories:
            matched_category = next(
                (c for c in categories if c["name"].lower() == tx.category.lower() and c["type"] == tx.type),
                None,
            )
            category_id = matched_category["id"] if matched_category else None
        
        try:
            tx_id = secrets.token_hex(16)
            await conn.execute(
                """
                INSERT INTO transactions (
                  id, user_id, type, amount, description, category_id, date, recurrence, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'none', ?)
                """,
                (tx_id, user["id"], tx.type, float(tx.amount), tx.description, category_id, tx.date, _now_iso()),
            )
            results["success"] += 1
        except Exception as e:
            results["failed"] += 1
            results["errors"].append(f"Failed to import: {tx.description} - {str(e)}")
    
    await conn.commit()
    return results


# STATS
@app.get("/stats")
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
    
    # Calculate totals
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")
    
    # Group by category for expenses
    expense_by_category = {}
    for t in transactions:
        if t["type"] == "expense" and t.get("category_name"):
            cat_name = t["category_name"]
            expense_by_category[cat_name] = expense_by_category.get(cat_name, 0) + t["amount"]
    
    # Group by date for chart
    by_date = {}
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


# AI SUGGEST CATEGORY
@app.post("/suggest-category")
async def suggest_category(
    data: SuggestCategoryRequest,
    user=fastapi.Depends(get_current_user),
):
    import json
    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise fastapi.HTTPException(
            status_code=500,
            detail="AI not configured. Set GEMINI_API_KEY in backend/.env.",
        )

    model = os.environ.get("GEMINI_MODEL") or "gemini-2.0-flash"

    category_names_by_type: dict[str, str] = {}
    for tx in data.transactions:
        if tx.type not in category_names_by_type:
            category_names_by_type[tx.type] = ", ".join(
                c.name for c in data.categories if c.type == tx.type
            )

    tx_lines = "\n".join(
        f"{i+1}. type={tx.type}, description=\"{tx.description}\""
        for i, tx in enumerate(data.transactions)
    )

    category_info = "\n".join(
        f"  {t}: {names}" for t, names in category_names_by_type.items()
    )

    prompt = (
        f"You are a financial assistant. Categorize each transaction below.\n"
        f"Available categories by type:\n{category_info}\n\n"
        f"Transactions:\n{tx_lines}\n\n"
        f"Respond with a JSON array with one object per transaction (same order), each containing: "
        f"suggestedCategory (string or null), confidence (number 0-1), reasoning (string). "
        f"Only use categories from the available list. If none fit, use null."
    )

    try:
        client = genai.Client(api_key=api_key)
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        result = json.loads(response.text)
        # Normalise: always return a list
        if isinstance(result, dict):
            result = [result]
        return result
    except Exception as e:
        raise fastapi.HTTPException(status_code=500, detail=str(e))
