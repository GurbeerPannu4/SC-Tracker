import time

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .cache import TTLCache

app = FastAPI()

COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets"
SPARKLINE_POINTS = 42  # CoinGecko sends ~168 hourly points; we thin them out

coins_cache = TTLCache(ttl_seconds=60)


class Coin(BaseModel):
    id: str
    symbol: str
    name: str
    image: str | None
    price: float | None
    change_24h: float | None
    sparkline: list[float]


def thin(values, max_points):
    """Evenly pick at most max_points values, always keeping the last one."""
    if len(values) <= max_points:
        return values
    step = len(values) / max_points
    picked = [values[int(i * step)] for i in range(max_points)]
    picked[-1] = values[-1]
    return picked


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
            "sparkline": "true",
        },
    )
    coins = []
    for raw in response.json():
        week = (raw.get("sparkline_in_7d") or {}).get("price") or []
        coins.append(
            Coin(
                id=raw["id"],
                symbol=raw["symbol"].upper(),
                name=raw["name"],
                image=raw.get("image"),
                price=raw.get("current_price"),
                change_24h=raw.get("price_change_percentage_24h"),
                sparkline=thin(week, SPARKLINE_POINTS),
            )
        )
    return coins


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