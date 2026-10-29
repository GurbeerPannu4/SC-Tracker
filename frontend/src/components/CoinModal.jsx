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

    
}