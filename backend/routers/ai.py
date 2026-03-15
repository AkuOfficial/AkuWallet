import json
import os

import fastapi
from google import genai
from google.genai import types

from dependencies import get_current_user
from models import SuggestCategoryRequest

router = fastapi.APIRouter(prefix="/suggest-category", tags=["ai"])


@router.post("")
async def suggest_category(
    data: SuggestCategoryRequest,
    user=fastapi.Depends(get_current_user),
):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise fastapi.HTTPException(
            status_code=500,
            detail="AI not configured. Set GEMINI_API_KEY in backend/.env.",
        )

    model = os.environ.get("GEMINI_MODEL") or "models/gemini-2.5-flash"

    category_names_by_type: dict[str, str] = {}
    for tx in data.transactions:
        if tx.type not in category_names_by_type:
            category_names_by_type[tx.type] = ", ".join(
                c.name for c in data.categories if c.type == tx.type
            )

    tx_lines = "\n".join(
        f'{i+1}. type={tx.type}, description="{tx.description}"'
        for i, tx in enumerate(data.transactions)
    )
    category_info = "\n".join(f"  {t}: {names}" for t, names in category_names_by_type.items())

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
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        result = json.loads(response.text)
        if isinstance(result, dict):
            result = [result]
        return result
    except Exception as e:
        raise fastapi.HTTPException(status_code=500, detail=str(e))
