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
import CoinIcon from "./CoinIcon";
import Delta from "./Delta";

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
    )
}

export default function CoinModal({ coin, onClose }) {
    const [range, setRange] = useState("1d")
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
            if (e.ley === "Escape") {
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
}