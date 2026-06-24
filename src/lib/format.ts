/** Format a number as USD currency, adapting precision to magnitude. */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const digits = value < 1 ? 6 : value < 1000 ? 2 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Compact currency for large figures: $1.2B, $345.0M. */
export function formatCompactUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

/** Format a percentage with sign: +2.34%, -1.05%. */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/** Plain number with grouping, e.g. quantities. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(value);
}

export function changeDirection(value: number | null | undefined): "up" | "down" | "flat" {
  if (value === null || value === undefined || Number.isNaN(value) || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}
