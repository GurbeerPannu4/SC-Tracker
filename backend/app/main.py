import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/markets"

class Coin(BaseModel):
    id: str
    symbol: str
    name: str
    price: float | None 
    change_24h: float | None
    
@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/coins", response_model=list[Coin])
def list_coins():
    try:
        response = httpx.get(
            COINGECKO_URL,
            params={
                "vs_currency": "usd",
                "order": "market_cap_desc",
                "per_page": 50,
                "page": 1,
            },
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(
            status_code=503,
            detail="Market data is temporarily unavailable."
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