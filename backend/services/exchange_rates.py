from datetime import datetime, timedelta
from decimal import Decimal
import httpx

CACHE: dict[str, tuple[dict[str, Decimal], datetime]] = {}
CACHE_TTL = timedelta(hours=24)

async def get_exchange_rate(from_currency: str, to_currency: str) -> Decimal:
    if from_currency == to_currency:
        return Decimal("1.0")

    now = datetime.utcnow()
    cached = CACHE.get(from_currency)
    if cached:
        rates, cached_at = cached
        if now - cached_at < CACHE_TTL:
            return rates.get(to_currency, Decimal("1.0"))

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.exchangerate-api.com/v4/latest/{from_currency}",
                timeout=5.0
            )
            data = response.json()
            rates = {k: Decimal(str(v)) for k, v in data["rates"].items()}
            CACHE[from_currency] = (rates, now)
            return rates.get(to_currency, Decimal("1.0"))
    except:
        return Decimal("1.0")

async def convert_amount(amount: Decimal, from_currency: str, to_currency: str) -> Decimal:
    rate = await get_exchange_rate(from_currency, to_currency)
    return amount * rate

async def get_all_rates(base_currency: str, currencies: list[str]) -> dict[str, Decimal]:
    rates = {}
    for currency in currencies:
        rates[currency] = await get_exchange_rate(base_currency, currency)
    return rates
