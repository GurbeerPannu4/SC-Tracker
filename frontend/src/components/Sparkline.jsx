export default function Sparkline({ values }) {
    if (!values || values.length < 2) return <div className="spark" />;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1

    const points = values
        .map((value,i) => {
            const x = (i / (values.length - 1)) * 100;
            const y = 28 - ((value-min) / span) * 26;
            return `${x},${y}`;
        })
    .join(" ");

    return (
        <svg className="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
            <polyline
            points={points}
            fill="none"
            stroke="var(--series-1)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scalling-stroke"
            />
        </svg>
    );
}