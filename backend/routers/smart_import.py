import os
import json
from typing import Any
from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
import httpx
from database import db
from dependencies import get_current_user

router = APIRouter(prefix="/smart-import", tags=["smart-import"])

class ReviewTransaction(BaseModel):
    type: str
    amount: float
    currency: str
    description: str
    category: str | None
    date: str
    confidence: float

class ConfirmImportRequest(BaseModel):
    transactions: list[dict[str, Any]]

async def analyze_with_gemini(file_content: str, categories: list[dict]) -> list[ReviewTransaction]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return []
    
    # Note: rules are added to the prompt context in analyze_file()
    prompt = f"""Analyze this bank statement and extract transactions. Return JSON array with:
- type (income/expense)
- amount (number)
- currency (ISO code)
- description (string)
- category (from: {', '.join([c['name'] for c in categories])})
- date (YYYY-MM-DD)
- confidence (0-1)

File content:
{file_content[:5000]}"""
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}",
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=30.0
            )
            data = response.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            transactions = json.loads(text)
            return [ReviewTransaction(**t) for t in transactions]
    except:
        return []

@router.post("/analyze")
async def analyze_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    
    async with db() as conn:
        async with conn.execute(
            "SELECT id, name, type FROM categories WHERE user_id = ? OR is_default = 1",
            (user["id"],)
        ) as cur:
            categories = [dict(row) for row in await cur.fetchall()]
        async with conn.execute(
            """
            SELECT r.match_contains, r.enabled, c.name AS category_name
            FROM automation_rules r
            JOIN categories c ON c.id = r.category_id
            WHERE r.user_id = ? AND r.enabled = 1
            ORDER BY r.created_at DESC
            """,
            (user["id"],),
        ) as cur2:
            rules = [dict(row) for row in await cur2.fetchall()]
    
    rules_text = ""
    if rules:
        rules_lines = []
        for r in rules:
            rules_lines.append(f"- if description contains '{r['match_contains']}', set category to '{r['category_name']}'")
        rules_text = "\n\nAutomation rules (apply these when choosing category):\n" + "\n".join(rules_lines)

    transactions = await analyze_with_gemini(text + rules_text, categories)
    return {"transactions": [t.dict() for t in transactions]}

@router.post("/confirm")
async def confirm_import(data: ConfirmImportRequest, user: dict = Depends(get_current_user)):
    import secrets
    from security import _now_iso
    
    async with db() as conn:
        for t in data.transactions:
            tx_id = secrets.token_hex(16)
            await conn.execute(
                """INSERT INTO transactions (id, user_id, type, amount, currency, description, category_id, date, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (tx_id, user["id"], t["type"], t["amount"], t.get("currency", "PLN"),
                 t.get("description"), t.get("category_id"), t["date"], _now_iso())
            )
        await conn.commit()
    
    return {"imported": len(data.transactions)}
