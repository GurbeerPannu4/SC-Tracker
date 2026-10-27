const standard = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD", 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const small = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumSignificantDigits: 3,
    maximumSignificantDigits: 4,
});

const wholeNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 })

export function formatPrice(price) {
    if (price == null) return "—";
    return Math.abs(price) >= 1 ? standard.format(price) : small.format(price);
}

export function formatPercent(price) {
    if (price == null) return null;
    return `${Math.abs(price).toFixed(2)}%`;
}

export function formatAxisPrice(price) {
    const abs = Math.abs(price);
    if (abs >= 1_000_000) return compactNumber.format(price);
    if (abs >= 1000) return wholeNumber.format(price);
    return formatPrice(price).replace("$", "");
}

export function formatTime(ms, ramge) {
    const date = new Date(ms)
    return range === "1d"
      ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit"})
      : date.toLocaleDateString([], { month: "short", day: "numeric"});
}

export function formatDateTime(ms) {
    return new Date(ms).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}