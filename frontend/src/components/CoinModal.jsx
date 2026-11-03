import { useEffect, useMemo, useRef, useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ReferenceDot,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { formatAxisPrice, formatDateTime, formatPrice, formatTime } from "../format";
import CoinIcon from "./CoinIcon.jsx";
import Delta from "./Delta.jsx";

const RANGES = [
    { id: "1d", label: "24H" },
    { id: "1w", label: "7D" },
    { id: "1m", label: "30D" },
];

function ChartTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const { t, price } = payload[0].payload;
    return (
        <div className="tooltip">
            <div className="tooltip-time">{formatDateTime(t)}</div>
            <div className="tooltip-price">{formatPrice(price)}</div>
        </div>
    );
}

export default function CoinModal({ coin, onClose }) {
    const [range, setRange] = useState("1d");
    const [view, setView] = useState("chart"); 
    const [points, setPoints] = useState([]);
    const [status, setStatus] = useState("loading"); 
    const [reloadKey, setReloadKey] = useState(0);
    const dialogRef = useRef(null);
    const closeRef = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        setStatus("loading");

        fetch(`/api/coins/${encodeURIComponent(coin.id)}/chart?range=${range}`, {
            signal: controller.signal,
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => {
                setPoints(data);
                setStatus("ready");
            })
            .catch((err) => {
                if (err.name === "AbortError") return;
                setStatus("error");
            });

        return () => controller.abort();
    }, [coin.id, range, reloadKey]);

    useEffect(() => {
        const opener = document.activeElement;
        closeRef.current?.focus();
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function onKeyDown(e) {
            if (e.key === "Escape") {
                onClose();
                return;
            }
            if (e.key !== "Tab") return;

            const focusable = dialogRef.current?.querySelectorAll("button");
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!dialogRef.current.contains(document.activeElement)) {
                e.preventDefault();
                first.focus();
            } else if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
            opener?.focus?.();        
        };
    }, [onClose]);

    const rangeChange = useMemo(() => {
        if (points.length < 2) return null;
        const first = points[0].price;
        const last = points[points.length - 1].price;
        return ((last - first) / first) * 100;
    }, [points]);

    const rangeLabel = RANGES.find((r) => r.id === range).label;
    const lastPoint = points[points.length - 1];

    return (
        <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            ref={dialogRef}
          >
            <header className="dialog-head">
                <CoinIcon coin={coin} size={40} />
                <div>
                  <h2 id="dialog-title">{coin.name}</h2>
                  <span className="muted">{coin.symbol}</span>
                </div>
                <button className="close" onClick={onClose} ref={closeRef} aria-label="Close">
                  ✕
                </button>
            </header>

            <div className="stats">
              <div className="stat">
                <span className="stat-label">Price</span>
                <span className="stat-value">{formatPrice(coin.price)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">{rangeLabel} change</span>
                <span className="stat-value">
                    <Delta value={rangeChange} />
                </span>
              </div>
            </div>

            <div className="controls">
              <div className="segmented" role="group" aria-label="Time range">
                 {RANGES.map((r) => (
                   <button
                     key={r.id}
                     className={r.id === range ? "active" : ""}
                     aria-pressed={r.id === range}
                     onClick={() => setRange(r.id)}
                   >
                     {r.label}
                   </button>
                ))} 
              </div>
              <div className="segmented" role="group" aria-label="View">
                {["chart", "table"].map((v) => (
                   <button 
                     key={v}
                     className={v === view ? "active" : ""}
                     aria-pressed={v === view}
                     onClick={() => setView(v)}
                   >
                     {v === "chart" ? "Chart" : "Table"}
                   </button>
                ))}
              </div>
            </div>

            <div className="plot">
              {status === "loading" && <p className="muted center">Loading price history…</p>}

              {status === "error" && (
                <div className="center">
                  <p className="error">Couldn't load the price history.</p>
                  <button className="btn" onClick={() => setReloadKey((k) => k + 1)}>
                    Try again
                  </button>
                </div>
              )}

              {status === "ready" && view === "chart" && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={points} margin={{ top: 12, right: 20, botton: 0, left: 0}}>
                    <CartesianGrid stroke="var(--grid)" vertical={false} />
                    <XAxis
                      dataKey="t"
                      type="number"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(t) => formatTime(t, range)}
                      tickLine={false}                 
                      axisLine={{ stroke: "var(--axis)" }}
                      stroke="var(--muted)"
                      minTickGap={48}
                      tickMargin={8}
                      padding={{ left: 8, right: 8 }}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickFormatter={formatAxisPrice}
                      tickLine={false}
                      axisLine={false}
                      stroke="var(--muted)"
                      width={68}
                      tickMargin={4}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--axis)", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="var(--series-1)"
                      strokeWidth={2}
                      fill="var(--series-1)"
                      fillOpacity={0.1}
                      dot={false}
                      activeDot={{ r: 4, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                    {lastPoint && (
                      <ReferenceDot
                        x={lastPoint.t}
                        y={lastPoint.price}
                        r={4}
                        fill="var(--series-1)"
                        stroke="var(--surface)"
                        strokeWidth={2}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {status === "ready" && view === "table" && (
                <div className="table-wrap">
                  <table>
                    <thread>
                       <tr>
                         <th>Time</th>
                         <th className="num">Price (USD)</th>
                      </tr>
                    </thread>
                    <tbody>
                      {[...points].reverse().map((p) => (
                        <tr key={p.t}>
                          <td>{formatDateTime(p.t)}</td>
                          <td className="num">{formatPrice(p.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
             )}
           </div>
         </div>
       </div>
    );
}