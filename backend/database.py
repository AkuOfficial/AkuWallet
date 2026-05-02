import os
from contextlib import asynccontextmanager
from typing import Any, Sequence

import aiosqlite

DB_PATH = os.environ.get("LOCAL_DB_PATH") or os.path.join(os.path.dirname(__file__), "local.db")

DEFAULT_CATEGORIES: list[dict[str, Any]] = [
    # Expense
    {"name": "Food & Dining", "type": "expense", "icon": "Utensils", "color": "#EF4444"},
    {"name": "Groceries", "type": "expense", "icon": "ShoppingCart", "color": "#F97316"},
    {"name": "Transport", "type": "expense", "icon": "Car", "color": "#F59E0B"},
    {"name": "Shopping", "type": "expense", "icon": "ShoppingBag", "color": "#A855F7"},
    {"name": "Bills & Utilities", "type": "expense", "icon": "Receipt", "color": "#3B82F6"},
    {"name": "Health", "type": "expense", "icon": "HeartPulse", "color": "#EC4899"},
    {"name": "Entertainment", "type": "expense", "icon": "Film", "color": "#06B6D4"},
    {"name": "Education", "type": "expense", "icon": "GraduationCap", "color": "#6366F1"},
    {"name": "Travel", "type": "expense", "icon": "Plane", "color": "#14B8A6"},
    {"name": "Personal Care", "type": "expense", "icon": "Sparkles", "color": "#F472B6"},
    {"name": "Home", "type": "expense", "icon": "Home", "color": "#84CC16"},
    {"name": "Subscriptions", "type": "expense", "icon": "RefreshCw", "color": "#8B5CF6"},
    # Income
    {"name": "Salary", "type": "income", "icon": "Briefcase", "color": "#22C55E"},
    {"name": "Freelance", "type": "income", "icon": "Laptop", "color": "#3B82F6"},
    {"name": "Business", "type": "income", "icon": "Building2", "color": "#F97316"},
    {"name": "Investments", "type": "income", "icon": "TrendingUp", "color": "#14B8A6"},
    {"name": "Rental Income", "type": "income", "icon": "Home", "color": "#84CC16"},
    {"name": "Bonus", "type": "income", "icon": "Star", "color": "#EAB308"},
    {"name": "Gifts", "type": "income", "icon": "Gift", "color": "#EC4899"},
    {"name": "Refunds", "type": "income", "icon": "RotateCcw", "color": "#8B5CF6"},
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
          account_id TEXT,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT NOT NULL DEFAULT 'PLN',
          description TEXT,
          category_id TEXT,
          date TEXT NOT NULL,
          recurrence TEXT NOT NULL DEFAULT 'none',
          recurrence_end_date TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE SET NULL,
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
          currency TEXT NOT NULL DEFAULT 'PLN',
          deadline TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_settings (
          user_id TEXT PRIMARY KEY,
          base_currency TEXT NOT NULL DEFAULT 'PLN',
          display_currency TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          currency TEXT NOT NULL DEFAULT 'PLN',
          balance REAL NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS investments (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          ticker TEXT,
          currency TEXT NOT NULL DEFAULT 'USD',
          invested_amount REAL NOT NULL,
          current_value REAL NOT NULL,
          quantity REAL,
          is_automated INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS exchange_rates (
          id TEXT PRIMARY KEY,
          from_currency TEXT NOT NULL,
          to_currency TEXT NOT NULL,
          rate REAL NOT NULL,
          date TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(from_currency, to_currency, date)
        );

        CREATE TABLE IF NOT EXISTS automation_rules (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT,
          match_contains TEXT NOT NULL,
          category_id TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_automation_rules_user ON automation_rules(user_id);
        """
    )

    # Add commission column if missing (migration)
    cols = await fetchone(conn, "PRAGMA table_info(investments)")
    async with conn.execute("PRAGMA table_info(investments)") as cur:
        col_names = [row["name"] async for row in cur]
    if "commission" not in col_names:
        await conn.execute("ALTER TABLE investments ADD COLUMN commission REAL NOT NULL DEFAULT 0")
        await conn.commit()

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
