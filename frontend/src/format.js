const standard = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD", 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const small = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 4,
});

export function formatPrice(price) {
    if (price == null) return "—";
    return Math.abs(price) >= 1 ? standard.format(price) : small.format(price);
}

export function formatPercent(price) {
    if (price == null) return null;
    return `${Math.abs(price).toFixed(2)}%`;
}