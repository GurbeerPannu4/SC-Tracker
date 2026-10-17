import time

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .cache import TTLCache

app = FastAPI()

COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets"

coins_cache = TTLCache(ttl_seconds=60)


class Coin(BaseModel):
    id: str
    symbol: str
    name: str
    price: float | None
    change_24h: float | None


def get_with_retries(url, params, attempts=3):
    """GET a URL, retrying on rate limits, server errors and network problems."""
    for attempt in range(1, attempts + 1):
        try:
            response = httpx.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            retryable = status == 429 or status >= 500
            if not retryable or attempt == attempts:
                raise
        except httpx.TransportError:
            if attempt == attempts:
                raise

        wait = 2 ** (attempt - 1)  # 1 second, then 2
        print(f"Attempt {attempt} failed, retrying in {wait}s")
        time.sleep(wait)


def fetch_coins():
    """Ask CoinGecko for the top 50 coins and keep only the fields we use."""
    print("Fetching fresh data from CoinGecko")
    response = get_with_retries(
        COINGECKO_URL,
        params={
            "vs_currency": "usd",
            "order": "market_cap_desc",
            "per_page": 50,
            "page": 1,
        },
    )
    return [
        Coin(
            id=raw["id"],
            symbol=raw["symbol"].upper(),
            name=raw["name"],
            price=raw.get("current_price"),
            change_24h=raw.get("price_change_percentage_24h"),
        )
        for raw in response.json()
    ]


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/coins", response_model=list[Coin])
def list_coins():
    cached = coins_cache.get("coins")
    if cached is not None:
        return cached

    try:
        coins = fetch_coins()
    except httpx.HTTPError as exc:
        print(f"CoinGecko request failed: {exc!r}")
        stale = coins_cache.get_stale("coins")
        if stale is not None:
            return stale
        raise HTTPException(
            status_code=503,
            detail="Market data is temporarily unavailable. Try again shortly.",
        )

    coins_cache.set("coins", coins)
    return coins