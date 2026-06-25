/** Derived per-candle statistics shown in the hover tooltip. */
export function candleStats(p: {
  open: number;
  high: number;
  low: number;
  close: number;
}): { chg: number; chgPercent: number; rangePercent: number } {
  const chg = p.close - p.open;
  const chgPercent = p.open ? (chg / p.open) * 100 : 0;
  const rangePercent = p.open ? ((p.high - p.low) / p.open) * 100 : 0;
  return { chg, chgPercent, rangePercent };
}

/** Tooltip time label: time-of-day for intraday intervals, date otherwise. */
export function formatCandleTime(timeSec: number, intraday: boolean): string {
  const d = new Date(timeSec * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  if (intraday) {
    return d.toLocaleString("en-US", {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    });
  }
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
