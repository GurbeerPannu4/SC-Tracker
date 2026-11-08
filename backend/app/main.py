import os
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Path, Query
from pydantic import BaseModel

from .cache import TTLCache
from .stocks import STOCKS

load_dotenv() 

app = FastAPI()

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
COINGECKO_URL = f"{COINGECKO_BASE}/coins/markets"
FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote"

SPARKLINE_POINTS = 42  
CHART_MAX_POINTS = 300  # plenty for a smooth chart, keeps responses small
RANGES = {"1d": 1, "1w": 7, "1m": 30} 

coins_cache = TTLCache(ttl_seconds=60)
chart_cache = TTLCache(ttl_seconds=300)
stocks_cache = TTLCache(ttl_seconds=60)


class Coin(BaseModel):
    id: str
    symbol: str
    name: str
    image: str | None
    price: float | None
    change_24h: float | None
    sparkline: list[float]


class ChartPoint(BaseModel):
    t: int  # time as a Unix timestamp in milliseconds (UTC)
    price: float


def thin(values, max_points):
    """Evenly pick at most max_points values, always keeping the last one."""
    if len(values) <= max_points:
        return values
    step = len(values) / max_points
    picked = [values[int(i * step)] for i in range(max_points)]
    picked[-1] = values[-1]
    return picked


def get_with_retries(url, params, attempts=3, headers=None):
    """GET a URL, retrying on rate limits, server errors and network problems."""
    for attempt in range(1, attempts + 1):
        try:
            response = httpx.get(url, params=params, headers=headers, timeout=10)
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


def fetch_chart(coin_id, range_):
    """Ask CoinGecko for one coin's price history."""
    print(f"Fetching {range_} chart for {coin_id} from CoinGecko")
    response = get_with_retries(
        f"{COINGECKO_BASE}/coins/{coin_id}/market_chart",
        params={"vs_currency": "usd", "days": RANGES[range_]},
    )
    prices = response.json().get("prices", [])
    points = [ChartPoint(t=int(t), price=p) for t, p in prices if p is not None]
    return thin(points, CHART_MAX_POINTS)


def fetch_quote(symbol, name, api_key):
    """One Finnhub quote. Returns None if this one stock fails, so the rest still show."""
    try:
        response = get_with_retries(
            FINNHUB_QUOTE_URL,
            params={"symbol": symbol},
            headers={"X-Finnhub-Token": api_key},  # in a header so the key never lands in logs
        )
        raw = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        print(f"Finnhub quote failed for {symbol}: {type(exc).__name__}")
        return None

    price = raw.get("c")
    if not price:  # Finnhub sends 0 for symbols it has no data for
        return None
    # Stocks reuse the Coin shape so the frontend can show both the same way.
    return Coin(
        id=symbol,
        symbol=symbol,
        name=name,
        image=None,
        price=price,
        change_24h=raw.get("dp"),  # percent change since the previous close
        sparkline=[],  # no free history for stocks, so no trend line
    )


def fetch_stocks(api_key):
    print("Fetching fresh stock quotes from Finnhub")
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda item: fetch_quote(item[0], item[1], api_key), STOCKS))
    return [stock for stock in results if stock is not None]


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


@app.get("/api/stocks", response_model=list[Coin])
def list_stocks():
    cached = stocks_cache.get("stocks")
    if cached is not None:
        return cached

    api_key = os.getenv("FINNHUB_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Stock data isn't set up: add FINNHUB_API_KEY to backend/.env and restart the backend.",
        )

    stocks = fetch_stocks(api_key)
    if not stocks:
        stale = stocks_cache.get_stale("stocks")
        if stale is not None:
            return stale
        raise HTTPException(
            status_code=503,
            detail="Stock data is temporarily unavailable. Try again shortly.",
        )

    stocks_cache.set("stocks", stocks)
    return stocks


@app.get("/api/coins/{coin_id}/chart", response_model=list[ChartPoint])
def coin_chart(
    coin_id: str = Path(pattern=r"^[a-z0-9-]{1,64}$"),
    range_: Literal["1d", "1w", "1m"] = Query("1d", alias="range"),
):
    key = (coin_id, range_)
    cached = chart_cache.get(key)
    if cached is not None:
        return cached

    try:
        points = fetch_chart(coin_id, range_)
    except httpx.HTTPError as exc:
        print(f"CoinGecko chart request failed: {exc!r}")
        if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Unknown coin.")
        stale = chart_cache.get_stale(key)
        if stale is not None:
            return stale
        raise HTTPException(
            status_code=503,
            detail="Market data is temporarily unavailable. Try again shortly.",
        )

    chart_cache.set(key, points)
    return points