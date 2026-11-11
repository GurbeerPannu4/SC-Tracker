import { useCallback, useMemo, useState } from "react";
import CoinCard from "./components/CoinCard.jsx";
import CoinModal from "./components/CoinModal.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import useMarketData from "./useMarketData.js";

const TABS = {
  crypto: { label: "Crypto", subtitle: "Top 50 cryptocurrencies by market cap" },
  stocks: { label: "Stocks", subtitle: "30 large US companies · change is since the previous close" },
};

const SORTS = {
  rank: { label: "Default order", compare: null }, // the order the API already gives us
  price: { label: "Price: high to low", compare: (a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity) },
  gainers: { label: "Change: best first", compare: (a, b) => (b.change_24h ?? -Infinity) - (a.change_24h ?? -Infinity) },
  losers: { label: "Change: worst first", compare: (a, b) => (a.change_24h ?? Infinity) - (b.change_24h ?? Infinity) },
  name: { label: "Name: A to Z", compare: (a, b) => a.name.localeCompare(b.name) },
};

export default function App() {
  const [tab, setTab] = useState("crypto"); // "crypto" | "stocks"
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("rank");

  // Both lists live here, but only the visible tab fetches and refreshes.
  const crypto = useMarketData("/api/coins", tab === "crypto");
  const stocks = useMarketData("/api/stocks", tab === "stocks");
  const market = tab === "crypto" ? crypto : stocks;
  const { items, status } = market;

  function switchTab(next) {
    setTab(next);
    setSelectedId(null);
    setQuery("");
  }

  // Filter, then sort. Each item keeps its original position no matter how the list is shown.
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    const ranked = items.map((coin, index) => ({ coin, rank: index + 1 }));
    const matches = text
      ? ranked.filter(
          ({ coin }) =>
            coin.name.toLowerCase().includes(text) || coin.symbol.toLowerCase().includes(text),
        )
      : ranked;
    const compare = SORTS[sortKey].compare;
    return compare ? [...matches].sort((a, b) => compare(a.coin, b.coin)) : matches;
  }, [items, query, sortKey]);

  const selected = tab === "crypto" ? crypto.items.find((coin) => coin.id === selectedId) ?? null : null;
  const closeModal = useCallback(() => setSelectedId(null), []);

  return (
    <div className="app">
      <header>
        <h1>Market Dashboard</h1>
        <p className="muted">{TABS[tab].subtitle}</p>
        <div className="segmented" role="group" aria-label="Market">
          {Object.entries(TABS).map(([key, { label }]) => (
            <button
              key={key}
              className={key === tab ? "active" : ""}
              aria-pressed={key === tab}
              onClick={() => switchTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {status === "loading" && <p className="muted">Loading prices…</p>}

      {status === "error" && (
        <p className="error">
          Couldn't load prices.{" "}
          {market.errorDetail || "Check that the backend is running, or try again in a minute."}{" "}
          <button className="btn small" onClick={market.reload} disabled={market.refreshing}>
            Try again
          </button>
        </p>
      )}

      {status === "ready" && (
        <>
          <div className="toolbar">
            <input
              type="search"
              className="search"
              placeholder="Search name or symbol"
              aria-label="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="sort">
              <span className="muted">Sort by</span>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                {Object.entries(SORTS).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="status-row">
            <p className="muted count" aria-live="polite">
              Showing {visible.length} of {items.length}
            </p>
            <p className={`updated ${market.refreshFailed ? "error" : "muted"}`}>
              {market.refreshFailed
                ? `Couldn't refresh. Showing prices from ${market.updatedAt?.toLocaleTimeString()}.`
                : `Updated ${market.updatedAt?.toLocaleTimeString()} · refreshes every minute`}
              <button className="btn small" onClick={market.reload} disabled={market.refreshing}>
                {market.refreshing ? "Refreshing…" : "Refresh now"}
              </button>
            </p>
          </div>

          {visible.length === 0 ? (
            <p className="muted">No matches for “{query.trim()}”.</p>
          ) : (
            <ul className="grid">
              {visible.map(({ coin, rank }) => (
                <CoinCard
                  key={coin.id}
                  coin={coin}
                  rank={tab === "crypto" ? rank : undefined}
                  onOpen={tab === "crypto" ? setSelectedId : undefined}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {selected && (
        <ErrorBoundary key={selected.id} onClose={closeModal}>
          <CoinModal coin={selected} onClose={closeModal} />
        </ErrorBoundary>
      )}
    </div>
  );
}