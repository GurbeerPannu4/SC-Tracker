import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CoinCard from "./components/CoinCard.jsx";
import CoinModal from "./components/CoinModal.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

const REFRESH_MS = 60_000; // matches the backend cache, so asking more often gains nothing

const SORTS = {
  rank: { label: "Market cap", compare: null }, // the order the API already gives us
  price: { label: "Price: high to low", compare: (a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity) },
  gainers: { label: "24h change: best first", compare: (a, b) => (b.change_24h ?? -Infinity) - (a.change_24h ?? -Infinity) },
  losers: { label: "24h change: worst first", compare: (a, b) => (a.change_24h ?? Infinity) - (b.change_24h ?? Infinity) },
  name: { label: "Name: A to Z", compare: (a, b) => a.name.localeCompare(b.name) },
};

export default function App() {
  const [coins, setCoins] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("rank");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  // Fetch the coin list. On a failed refresh we keep showing the old data.
  const loadCoins = useCallback(async () => {
    if (inFlight.current) return; // never run two requests at once
    inFlight.current = true;
    setRefreshing(true);
    try {
      const res = await fetch("/api/coins");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCoins(await res.json());
      setStatus("ready");
      setUpdatedAt(new Date());
      setRefreshFailed(false);
    } catch {
      setRefreshFailed(true);
      setStatus((current) => (current === "loading" ? "error" : current));
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  // Load once, then every minute. Skip while the tab is hidden; catch up when it comes back.
  useEffect(() => {
    loadCoins();
    const timer = setInterval(() => {
      if (!document.hidden) loadCoins();
    }, REFRESH_MS);
    const onVisible = () => {
      if (!document.hidden) loadCoins();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadCoins]);

  // Filter, then sort. Each coin keeps its market-cap rank no matter how the list is shown.
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    const ranked = coins.map((coin, index) => ({ coin, rank: index + 1 }));
    const matches = text
      ? ranked.filter(
          ({ coin }) =>
            coin.name.toLowerCase().includes(text) || coin.symbol.toLowerCase().includes(text),
        )
      : ranked;
    const compare = SORTS[sortKey].compare;
    return compare ? [...matches].sort((a, b) => compare(a.coin, b.coin)) : matches;
  }, [coins, query, sortKey]);

  const selected = coins.find((coin) => coin.id === selectedId) ?? null;
  const closeModal = useCallback(() => setSelectedId(null), []);

  return (
    <div className="app">
      <header>
        <h1>Market Dashboard</h1>
        <p className="muted">Top 50 cryptocurrencies by market cap</p>
      </header>

      {status === "loading" && <p className="muted">Loading prices…</p>}

      {status === "error" && (
        <p className="error">
          Couldn't load prices. Check that the backend is running, or try again in a minute.
        </p>
      )}

      {status === "ready" && (
        <>
          <div className="toolbar">
            <input
              type="search"
              className="search"
              placeholder="Search name or symbol"
              aria-label="Search coins"
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
              Showing {visible.length} of {coins.length}
            </p>
            <p className={`updated ${refreshFailed ? "error" : "muted"}`}>
              {refreshFailed
                ? `Couldn't refresh. Showing prices from ${updatedAt?.toLocaleTimeString()}.`
                : `Updated ${updatedAt?.toLocaleTimeString()} · refreshes every minute`}
              <button className="btn small" onClick={loadCoins} disabled={refreshing}>
                {refreshing ? "Refreshing…" : "Refresh now"}
              </button>
            </p>
          </div>

          {visible.length === 0 ? (
            <p className="muted">No coins match “{query.trim()}”.</p>
          ) : (
            <ul className="grid">
              {visible.map(({ coin, rank }) => (
                <CoinCard key={coin.id} coin={coin} rank={rank} onOpen={setSelectedId} />
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