import { formatPrice } from "../format.js";
import CoinIcon from "./CoinIcon.jsx";
import Sparkline from "./Sparkline.jsx";
import Delta from "./Delta.jsx";

export default function CoinCard({ coin, rank, onOpen }) {
  const content = (
    <>
      <div className="card-top">
        <CoinIcon coin={coin} />
        <div className="card-name">
          <strong>{coin.symbol}</strong>
          <span>{coin.name}</span>
        </div>
        {rank != null && <span className="rank">#{rank}</span>}
      </div>

      <div className="card-price">{formatPrice(coin.price)}</div>

      <div className="card-bottom">
        <Delta value={coin.change_24h} />
        {coin.sparkline.length > 1 && <Sparkline values={coin.sparkline} />}
      </div>
    </>
  );

  if (!onOpen) {
    return (
      <li>
        <div className="card">{content}</div>
      </li>
    );
  }

  return (
    <li>
      <button className="card" onClick={() => onOpen(coin.id)} aria-label={`${coin.name}, open chart`}>
        {content}
      </button>
    </li>
  );
}