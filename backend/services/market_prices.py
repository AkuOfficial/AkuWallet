from datetime import datetime, timedelta
from decimal import Decimal
import httpx

CACHE: dict[str, tuple[Decimal, datetime]] = {}
CACHE_TTL = timedelta(minutes=15)

async def get_ticker_price(ticker: str) -> Decimal | None:
    now = datetime.utcnow()
    cached = CACHE.get(ticker)
    if cached:
        price, cached_at = cached
        if now - cached_at < CACHE_TTL:
            return price

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}",
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=5.0,
            )
            data = response.json()
            price = Decimal(str(
                data["chart"]["result"][0]["meta"]["regularMarketPrice"]
            ))
            CACHE[ticker] = (price, now)
            return price
    except Exception:
        return None
