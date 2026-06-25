import type { StockOHLCPoint } from "./fmp";

const BASE = "https://api.twelvedata.com";
const KEY  = import.meta.env.VITE_TWELVE_DATA_KEY as string | undefined;

export const tdConfigured = Boolean(KEY);

interface TDBar {
  datetime: string; // "2024-03-15 09:30:00" or "2024-03-15"
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface TDResponse {
  values?: TDBar[];
  status?: string;
  code?: number;
  message?: string;
}

/** Cache TTLs by interval type. */
function cacheTtl(tdInterval: string): number {
  if (tdInterval === "15min" || tdInterval === "1h") return 2 * 60 * 1000;
  if (tdInterval === "4h") return 10 * 60 * 1000;
  return 60 * 60 * 1000; // 1day / 1week / 1month
}

function cacheKey(symbol: string, interval: string) {
  return `meridian:td:${symbol.toUpperCase()}:${interval}`;
}

function readCache(key: string, ttl: number): StockOHLCPoint[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: StockOHLCPoint[]; ts: number };
    return Date.now() - ts < ttl ? data : null;
  } catch { return null; }
}

function writeCache(key: string, data: StockOHLCPoint[]): void {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch { /* ignore */ }
}

function mapBar(b: TDBar): StockOHLCPoint | null {
  const time = Math.floor(new Date(b.datetime).getTime() / 1000);
  if (Number.isNaN(time)) return null;
  return {
    time,
    open:   parseFloat(b.open),
    high:   parseFloat(b.high),
    low:    parseFloat(b.low),
    close:  parseFloat(b.close),
    volume: parseFloat(b.volume) || undefined,
  };
}

/**
 * Fetch OHLC candles for a stock from Twelve Data.
 * Returns empty array if key not configured or request fails (caller falls back to FMP daily).
 */
export async function getStockKlines(
  symbol: string,
  tdInterval: string,
  outputsize = 500,
): Promise<StockOHLCPoint[]> {
  if (!KEY) return [];

  const ck  = cacheKey(symbol, tdInterval);
  const ttl = cacheTtl(tdInterval);
  const hit = readCache(ck, ttl);
  if (hit) return hit;

  try {
    const url =
      `${BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${tdInterval}` +
      `&outputsize=${outputsize}&apikey=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Twelve Data ${res.status}`);
    const body = (await res.json()) as TDResponse;
    if (body.status === "error" || !Array.isArray(body.values)) {
      throw new Error(body.message ?? "Twelve Data error");
    }
    const data: StockOHLCPoint[] = (body.values ?? [])
      .map(mapBar)
      .filter((p): p is StockOHLCPoint => p !== null)
      .sort((a, b) => a.time - b.time);

    writeCache(ck, data);
    return data;
  } catch {
    return [];
  }
}
