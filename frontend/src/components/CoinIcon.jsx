import { useState } from "react";

export default function CoinIcon({coin, size = 32}) {
    const [failed, setFailed] = useState(false);

    if (!coin.image || failed) {
        return (
            <span
            className="coin-icon fallback"
            style={{ width: size, height: size }}
            aria-hidden="true"
            >
                {coin.symbol.slize(0, 1)}
            </span>
        );
    }

    return (
        <img
        className="coin-icon"
        src={coin.image}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        />
    );
}