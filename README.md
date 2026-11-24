# SC Tracker: Market Dashboard

A full-stack dashboard that shows live prices for the **top 50 cryptocurrencies** and **30 large US stocks**, with interactive price charts for crypto. Built with a **React** frontend and a **FastAPI (Python)** backend.

![SC Tracker screenshot](docs/screenshot.png)

<!-- Optional: add a live link here once deployed -->
<!-- **Live demo:** https://your-app.example.com -->

## Features

- **Crypto and Stocks tabs** with price, change since the previous period, and a 7-day trend line for each crypto
- **Click a coin** to open a chart with **24H / 7D / 30D** ranges, a hover tooltip, and a **Table view** of the same data
- **Search** by name or symbol and **sort** by price, change or name
- **Auto-refresh every minute**, paused while the browser tab is hidden and only for the tab you're looking at
- **Resilient to API problems:** if a refresh fails, the last good prices stay on screen with a clear message and a retry button
- **Accessible:** keyboard navigation, focus handling in the popup, screen-reader text for price direction (arrows and text, never color alone), light and dark mode

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React, Vite, Recharts, plain CSS (custom properties for light/dark themes) |
| Backend | Python, FastAPI, Pydantic, httpx, uvicorn |
| Data | [CoinGecko](https://www.coingecko.com/) API (crypto), [Finnhub](https://finnhub.io/) API (stocks) |
| Testing | pytest, FastAPI TestClient |

## How it works

```
Browser (React, :5173)
   │  /api/*  (Vite dev proxy, so no CORS setup is needed)
   ▼
FastAPI backend (:8000)
   │  in-memory cache  →  retries with backoff  →  stale fallback
   ▼
CoinGecko  /  Finnhub
```

The browser never talks to the data providers directly. All requests go through the backend, which:

- **Hides the API key.** The Finnhub key lives in `backend/.env` and is sent in a request header, so it never appears in URLs or logs.
- **Caches responses** (60 s for prices, 5 min for charts) so many users or tabs share one upstream request. This keeps the app inside the free tiers' rate limits.
- **Retries** on rate limits (429), server errors and network failures with backoff, and does not retry errors that can't succeed (such as 404).
- **Falls back to the last good data** if a provider is down, instead of showing an error.
- **Downsamples** chart data (up to 300 points) so responses stay small.
- **Validates input** (coin IDs and chart ranges) before calling anything upstream.
- **Isolates failures:** if one stock's quote fails, the other stocks still load.

### API

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Health check |
| `GET /api/coins` | Top 50 coins: price, 24h change, 7-day sparkline |
| `GET /api/coins/{id}/chart?range=1d\|1w\|1m` | Price history for one coin |
| `GET /api/stocks` | 30 large US stocks: price and change since the previous close |

Interactive API docs are available at http://localhost:8000/docs when the backend is running.

## Getting started

**Prerequisites:** Python 3.10+, Node.js 20+, and a free [Finnhub API key](https://finnhub.io/register) (crypto works without a key; the Stocks tab needs one).

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

Create your environment file by copying the example, then paste your key into it:

```bash
# Windows:  copy .env.example .env
# macOS / Linux:  cp .env.example .env
```

```
FINNHUB_API_KEY=your_key_here
```

Start the server:

```bash
uvicorn app.main:app --reload
```

Check http://localhost:8000/api/health. It should show `{"status":"ok"}`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

### Tests

```bash
cd backend
python -m pytest -q
```

The tests fake all network calls, so they are fast, free and never use your API key. They cover caching, retries, rate-limit handling, the stale-data fallback, input validation, chart downsampling, and the stock endpoint (including a missing key and partial failures).

## Project structure

```
SC-Tracker/
├── backend/
│   ├── app/
│   │   ├── main.py        # API routes, provider calls, retries, caching
│   │   ├── cache.py       # small TTL cache with stale fallback
│   │   └── stocks.py      # the list of stocks to show
│   ├── tests/             # pytest suite
│   ├── .env.example       # template for your local .env
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx            # tabs, search, sort, layout
        ├── useMarketData.js   # fetching + auto-refresh hook
        ├── format.js          # price / percent / time formatting
        └── components/        # CoinCard, CoinModal (chart), Sparkline, Delta, ...
```

## Known limitations

- **No stock charts.** Finnhub's free plan doesn't include historical prices, so stock cards show live quotes only. Adding a second data source is the planned next step.
- **The cache lives in memory** and is cleared when the server restarts. That's fine for a single instance; a multi-server deployment would use Redis.
- **Free-tier rate limits.** CoinGecko's free API is rate limited, so you may occasionally see a "try again" message. The app caches and retries to keep this rare.
- The stock list is fixed in `backend/app/stocks.py` (Finnhub's free plan can't list "the top N companies").

## Data sources

Cryptocurrency data provided by [CoinGecko](https://www.coingecko.com/). Stock quotes provided by [Finnhub](https://finnhub.io/). Prices are for information only and are not financial advice.
