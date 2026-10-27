import { formatPercent } from "../format.js";

export default function Delta( { value }) {
    const text = formatPercent(value);
    if (text == null) return <span className="delta flat">—</span>;

    const direction = value >= 0 ? "up" : "down";
    return (
        <span className={`delta ${direction}`}>
            <span aria-hidden="true">{direction === "up" ? "▲" : "▼"}</span>
            <span className="sr-only">{direction} </span>
            {text}
        </span>
    );
}