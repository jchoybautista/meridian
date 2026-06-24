import type { Asset, PricePoint } from "../types";
import { STOCK_UNIVERSE, seedStock, seedStocks } from "./stockSeed";
import { getFMPStockList, fmpConfigured } from "./fmp";

const BASE = "https://www.alphavantage.co/query";
const KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY as string | undefined;

export { STOCK_UNIVERSE };

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
