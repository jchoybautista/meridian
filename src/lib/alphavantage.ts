import type { Asset, PricePoint } from "../types";
import { STOCK_UNIVERSE, seedStock, seedStocks } from "./stockSeed";
import { getFMPStockList, fmpConfigured, type StockOHLCPoint } from "./fmp";

const BASE = "https://www.alphavantage.co/query";
const KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY as string | undefined;

export { STOCK_UNIVERSE };

export const avConfigured = Boolean(KEY);
export const stocksUsingSampleData = !fmpConfigured && !KEY;

interface GlobalQuoteResponse {
  "Global Quote"?: {
    "05. price": string;
    "10. change percent": string;
    "03. high": string;
    "04. low": string;
    "06. volume": string;
  };
  Note?: string;
  Information?: string;
}

/**
 * Returns live stock quotes via FMP when VITE_FMP_KEY is set (250 req/day,
 * cached 3 min), otherwise falls back to curated seed data.
 */
export async function getStockList(): Promise<{ assets: Asset[]; sample: boolean }> {
  if (fmpConfigured) return getFMPStockList();
  return { assets: seedStocks(), sample: true };
}

/** Fetch a single live stock quote, falling back to seed data on any failure. */
export async function getStockQuote(symbol: string): Promise<{ asset: Asset; sample: boolean }> {
  const fallback = seedStock(symbol);
  if (!KEY) {
    if (fallback) return { asset: fallback, sample: true };
    throw new Error(`Unknown stock "${symbol}".`);
  }
  try {
    const url = `${BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as GlobalQuoteResponse;
    const q = data["Global Quote"];
    if (!q || !q["05. price"]) {
      if (fallback) return { asset: fallback, sample: true };
      throw new Error("Stock data unavailable.");
    }
    const meta = STOCK_UNIVERSE.find((s) => s.symbol === symbol);
    return {
      asset: {
        id: symbol,
        symbol,
        name: meta?.name ?? symbol,
        type: "stock",
        price: parseFloat(q["05. price"]),
        change24h: parseFloat(q["10. change percent"].replace("%", "")),
        high24h: parseFloat(q["03. high"]),
        low24h: parseFloat(q["04. low"]),
        volume24h: parseFloat(q["06. volume"]),
        marketCap: fallback?.marketCap,
        sparkline: fallback?.sparkline,
      },
      sample: false,
    };
  } catch {
    if (fallback) return { asset: fallback, sample: true };
    throw new Error("Stock data unavailable.");
  }
}

/** Daily price history for a stock chart, with synthetic fallback. */
export async function getStockChart(symbol: string, points = 30): Promise<PricePoint[]> {
  const fallback = seedStock(symbol);
  const base = fallback?.price ?? 100;
  if (!KEY) return syntheticSeries(base, points);
  try {
    const url = `${BASE}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as {
      "Time Series (Daily)"?: Record<string, { "4. close": string }>;
    };
    const series = data["Time Series (Daily)"];
    if (!series) return syntheticSeries(base, points);
    return Object.entries(series)
      .slice(0, points)
      .reverse()
      .map(([date, v]) => ({ time: new Date(date).getTime(), price: parseFloat(v["4. close"]) }));
  } catch {
    return syntheticSeries(base, points);
  }
}

/** Deterministic synthetic OHLC candles so the candlestick chart renders without any API keys. */
function syntheticOHLC(base: number, points: number): StockOHLCPoint[] {
  const out: StockOHLCPoint[] = [];
  const now = Date.now();
  const DAY = 86_400;
  for (let i = points - 1; i >= 0; i--) {
    const trend = base + Math.sin(i / 3) * base * 0.03 + Math.cos(i / 7) * base * 0.015;
    const close = +trend.toFixed(2);
    const bodyPct = 0.008;
    const wickPct = 0.006;
    const open = +(close + Math.sin(i * 1.7) * close * bodyPct).toFixed(2);
    const high = +(Math.max(open, close) + Math.abs(Math.sin(i * 2.3)) * close * wickPct).toFixed(2);
    const low = +(Math.min(open, close) - Math.abs(Math.sin(i * 3.1)) * close * wickPct).toFixed(2);
    out.push({ time: Math.floor(now / 1000) - i * DAY, open, high, low, close });
  }
  return out;
}

/** Daily OHLC from Alpha Vantage TIME_SERIES_DAILY (fallback when FMP key not set). */
export async function getStockDailyOHLC(symbol: string, points = 100): Promise<StockOHLCPoint[]> {
  if (!KEY) {
    const seed = seedStock(symbol);
    return syntheticOHLC(seed?.price ?? 100, points);
  }

  const cacheKey = `meridian:av:ohlc:${symbol}`;
  const CACHE_TTL = 15 * 60 * 1000;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: StockOHLCPoint[]; ts: number };
      if (Date.now() - ts < CACHE_TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const url = `${BASE}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`AV ${res.status}`);
    const body = (await res.json()) as {
      "Time Series (Daily)"?: Record<string, {
        "1. open": string; "2. high": string;
        "3. low": string; "4. close": string; "5. volume": string;
      }>;
    };
    const series = body["Time Series (Daily)"];
    if (!series) return [];
    const data: StockOHLCPoint[] = Object.entries(series)
      .slice(0, points)
      .reverse()
      .map(([date, v]) => ({
        time: Math.floor(new Date(date).getTime() / 1000),
        open: parseFloat(v["1. open"]),
        high: parseFloat(v["2. high"]),
        low: parseFloat(v["3. low"]),
        close: parseFloat(v["4. close"]),
        volume: parseFloat(v["5. volume"]),
      }))
      .filter((d) => !Number.isNaN(d.time));
    try { localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); } catch { /* ignore */ }
    return data;
  } catch {
    return [];
  }
}

/** Deterministic gently-trending series so charts always render. */
function syntheticSeries(base: number, points: number): PricePoint[] {
  const out: PricePoint[] = [];
  const now = Date.now();
  const day = 86_400_000;
  for (let i = points - 1; i >= 0; i--) {
    const wobble = Math.sin(i / 3) * base * 0.03 + Math.cos(i / 7) * base * 0.015;
    out.push({ time: now - i * day, price: +(base + wobble).toFixed(2) });
  }
  return out;
}
