import type { Asset } from "../types";
import { STOCK_UNIVERSE, seedStocks, seedStock } from "./stockSeed";

const BASE = "https://financialmodelingprep.com/api/v3";
const KEY = import.meta.env.VITE_FMP_KEY as string | undefined;

export const fmpConfigured = Boolean(KEY);

interface FMPQuote {
  symbol: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  previousClose: number;
}

const ALL_SYMBOLS = STOCK_UNIVERSE.map((s) => s.symbol).join(",");

const CACHE_KEY = "meridian:fmp:bulk";
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

function readCache(): { data: FMPQuote[]; ts: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as { data: FMPQuote[]; ts: number }) : null;
  } catch {
    return null;
  }
}

function writeCache(data: FMPQuote[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* ignore */ }
}

function fmpToAsset(q: FMPQuote, rank: number): Asset {
  const meta = STOCK_UNIVERSE.find((s) => s.symbol === q.symbol);
  const seed = seedStock(q.symbol);
  return {
    id: q.symbol,
    symbol: q.symbol,
    name: meta?.name ?? q.symbol,
    type: "stock",
    price: q.price,
    change24h: q.changesPercentage,
    high24h: q.dayHigh,
    low24h: q.dayLow,
    volume24h: q.volume,
    marketCap: q.marketCap,
    rank,
    sparkline: seed?.sparkline, // keep synthetic sparkline for dashboard cards
  };
}

/**
 * Fetch live quotes for all tracked stocks in one API call (FMP free: 250/day).
 * Results are cached for 3 minutes to avoid burning the daily budget on rerenders.
 * Falls back to seed data if the key is missing or the request fails.
 */
export async function getFMPStockList(): Promise<{ assets: Asset[]; sample: boolean }> {
  if (!KEY) return { assets: seedStocks(), sample: true };

  // Serve from cache if fresh
  const cached = readCache();
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return { assets: mapQuotes(cached.data), sample: false };
  }

  try {
    const url = `${BASE}/quote/${ALL_SYMBOLS}?apikey=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`FMP ${res.status}`);
    const data = (await res.json()) as FMPQuote[];
    if (!Array.isArray(data) || data.length === 0) throw new Error("Empty response");

    writeCache(data);
    return { assets: mapQuotes(data), sample: false };
  } catch {
    // Serve stale cache rather than pure seed data if available
    const stale = readCache();
    if (stale) return { assets: mapQuotes(stale.data), sample: false };
    return { assets: seedStocks(), sample: true };
  }
}

function mapQuotes(quotes: FMPQuote[]): Asset[] {
  const symbolOrder = STOCK_UNIVERSE.map((s) => s.symbol);
  const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));
  return symbolOrder
    .map((sym, i) => {
      const q = bySymbol.get(sym);
      return q ? fmpToAsset(q, i + 1) : null;
    })
    .filter((a): a is Asset => a !== null);
}

// ─── Company profile ────────────────────────────────────────────────────────

export interface StockProfile {
  description: string;
  sector?: string;
  industry?: string;
  ceo?: string;
  employees?: number;
  website?: string;
  country?: string;
  exchange?: string;
  ipoDate?: string;
  beta?: number;
  pe?: number;
  week52High?: number;
  week52Low?: number;
  avgVolume?: number;
  dividendYield?: number;
}

interface FMPProfile {
  description?: string;
  sector?: string;
  industry?: string;
  ceo?: string;
  fullTimeEmployees?: string;
  website?: string;
  country?: string;
  exchangeShortName?: string;
  ipoDate?: string;
  beta?: number;
  pe?: number;
  lastDiv?: number;
  volAvg?: number;
  range?: string; // "low-high" for 52-week
}

/**
 * Fetch company profile for a stock. Uses FMP free key (counts toward 250/day limit).
 * Falls back to empty profile if no key or request fails.
 */
export async function getStockProfile(symbol: string): Promise<StockProfile> {
  if (!KEY) return { description: "" };

  const cacheKey = `meridian:fmp:profile:${symbol}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as StockProfile;
  } catch { /* ignore */ }

  try {
    const url = `${BASE}/profile/${symbol}?apikey=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`FMP profile ${res.status}`);
    const data = (await res.json()) as FMPProfile[];
    const p = data[0];
    if (!p) return { description: "" };

    // Parse 52-week range "low-high"
    let week52Low: number | undefined;
    let week52High: number | undefined;
    if (p.range) {
      const [lo, hi] = p.range.split("-").map(Number);
      if (!Number.isNaN(lo)) week52Low = lo;
      if (!Number.isNaN(hi)) week52High = hi;
    }

    const profile: StockProfile = {
      description: p.description ?? "",
      sector: p.sector,
      industry: p.industry,
      ceo: p.ceo,
      employees: p.fullTimeEmployees ? parseInt(p.fullTimeEmployees.replace(/,/g, ""), 10) : undefined,
      website: p.website,
      country: p.country,
      exchange: p.exchangeShortName,
      ipoDate: p.ipoDate,
      beta: p.beta,
      pe: p.pe,
      week52High,
      week52Low,
      avgVolume: p.volAvg,
      dividendYield: p.lastDiv,
    };

    try { localStorage.setItem(cacheKey, JSON.stringify(profile)); } catch { /* ignore */ }
    return profile;
  } catch {
    return { description: "" };
  }
}

// ─── Historical OHLC for candlestick ────────────────────────────────────────

export interface StockOHLCPoint {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

interface FMPHistorical {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Full daily OHLC history for a stock from FMP.
 * `days='max'` returns all available history; numeric days limits to recent N days.
 * Returns empty array if no key set (caller should fall back to synthetic area chart).
 */
export async function getStockOHLC(
  symbol: string,
  days: number | "max" = "max",
): Promise<StockOHLCPoint[]> {
  if (!KEY) return [];

  const cacheKey = `meridian:fmp:ohlc:${symbol}:${days}`;
  const CACHE_TTL = 15 * 60 * 1000; // 15 min for price history
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: StockOHLCPoint[]; ts: number };
      if (Date.now() - ts < CACHE_TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const limitParam = days === "max" ? "" : `&timeseries=${days}`;
    const url = `${BASE}/historical-price-full/${symbol}?apikey=${KEY}${limitParam}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`FMP OHLC ${res.status}`);
    const body = (await res.json()) as { historical?: FMPHistorical[] };
    const hist = body.historical ?? [];

    const data: StockOHLCPoint[] = hist
      .map((h) => ({
        time: Math.floor(new Date(h.date).getTime() / 1000),
        open: h.open,
        high: h.high,
        low: h.low,
        close: h.close,
      }))
      .filter((d) => !Number.isNaN(d.time))
      .sort((a, b) => a.time - b.time);

    try { localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); } catch { /* ignore */ }
    return data;
  } catch {
    return [];
  }
}
