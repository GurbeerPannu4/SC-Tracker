import { formatPercent, formatPrice } from "../format.js";
import CoinIcon from "./CoinIcon.jsx"
import Sparkline from "./Sparkline.jsx";

export default function CoinCard({ coin, rank }) {
  const change = formatPercent(coin.change_24h);
  const direction =
    coin.change_24h == null ? "flat" : coin.change_24h >= 0 ? "up" : "down";

  return (
    <li className="card">
      <div className="card-top">
        <CoinIcon coin={coin} />
        <div className="card-name">
          <strong>{coin.symbol}</strong>
          <span>{coin.name}</span>
        </div>
        <span className="rank">#{rank}</span>
      </div>

      <div className="card-price">{formatPrice(coin.price)}</div>

      <div className="card-bottom">
        <div className={`delta ${direction}`}>
        {change == null ? (
          "—"
        ) : (
          <>
            <span aria-hidden="true">{direction === "up" ? "▲" : "▼"}</span>
            <span className="sr-only">{direction} </span>
            {change}
          </>
        )}
        </div>
        <Sparkline values={coin.sparkline} />
      </div>
    </li>
  );
}