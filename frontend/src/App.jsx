import { useEffect, useState } from "react";

export default function App() {
  const [coins, setCoins] = useState([]);
  const [error, setError] = useState("");

  useEffect (() => {
    fetch("/app/coins")
    .then((res) => {
      if (!res.ok) throw new Error(`Request failed (HTTP ${res.status})`);
      return res.json();
    })
    .then(setCoins)
    .catch((err) => setError(err.message));
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 24, textAlign: "left"}}>
      <h1>Market Dashboard</h1>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12}}>
        {coins.map((coin) => (
          <li key={coin.id} style={{ border: "1px solid #8884", borderRadius: 12, padding: 16 }}>
            <strong>{coin.symbol}</strong> <span>{coin.name}</span>
            <div style={{ fontSize: 23 }}>${coin.price.toLocaleString()}</div>
            <div>{coin.change_24h >= 0 ? "▲" : "▼"} {Math.abs(coin.change_24h)}%</div>
          </li>
        ))}
      </ul>
    </div>
  );
}