import { useEffect, useState } from "react";
import CoinCard from "./components/CoinCard.jsx";

export default function App() {
  const [coins, setCoins] = useState([]);
  const [status, setStatus] = useState("loading"); // "loading" | "ready" | "error"

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
            <CoinCard key={coin.id} coin={coin} rank={index + 1} />
          ))}
        </ul>
      )}
    </div>
  );
}