import os
from contextlib import asynccontextmanager
from typing import Any, Sequence

import aiosqlite

DB_PATH = os.environ.get("LOCAL_DB_PATH") or os.path.join(os.path.dirname(__file__), "local.db")

DEFAULT_CATEGORIES: list[dict[str, Any]] = [
    {"name": "Food", "type": "expense", "icon": "Utensils", "color": "#EF4444"},
    {"name": "Transport", "type": "expense", "icon": "Car", "color": "#F97316"},
    {"name": "Shopping", "type": "expense", "icon": "ShoppingBag", "color": "#A855F7"},
    {"name": "Bills", "type": "expense", "icon": "Receipt", "color": "#3B82F6"},
    {"name": "Health", "type": "expense", "icon": "HeartPulse", "color": "#22C55E"},
    {"name": "Entertainment", "type": "expense", "icon": "Film", "color": "#06B6D4"},
    {"name": "Other Expense", "type": "expense", "icon": "CircleEllipsis", "color": "#71717A"},
    {"name": "Salary", "type": "income", "icon": "Briefcase", "color": "#22C55E"},
    {"name": "Bonus", "type": "income", "icon": "Sparkles", "color": "#84CC16"},
    {"name": "Other Income", "type": "income", "icon": "Plus", "color": "#10B981"},
]


@asynccontextmanager
async def db():
    conn = await aiosqlite.connect(DB_PATH)
    conn.row_factory = aiosqlite.Row
    try:
        yield conn
    finally:
        await conn.close()


async def fetchone(
    conn: aiosqlite.Connection,
    sql: str,
    params: Sequence[Any] | None = None,
) -> aiosqlite.Row | None:
    async with conn.execute(sql, params or ()) as cur:
        return await cur.fetchone()


async def migrate(conn: aiosqlite.Connection) -> None:
    import secrets
    from security import _now_iso

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
