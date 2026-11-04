import { useCallback, useEffect, useState } from "react";
import CoinCard from "./components/CoinCard.jsx";
import CoinModal from "./components/CoinModal.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

export default function App() {
  const [coins, setCoins] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetch("/api/coins")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setCoins(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

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
        <ul className="grid">
          {coins.map((coin, index) => (
            <CoinCard key={coin.id} coin={coin} rank={index + 1} onOpen={setSelectedId} />
          ))}
        </ul>
      )}

      {selected && (
        <ErrorBoundary key={selected.id} onClose={closeModal}>
          <CoinModal coin={selected} onClose={closeModal} />
        </ErrorBoundary>
      )}
    </div>
  );
}