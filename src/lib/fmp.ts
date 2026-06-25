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
const CACHE_TTL = 45 * 1000; // 45s — short enough for visibility-gated polling

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
  volume?: number;
}

interface FMPHistorical {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** Map FMP daily history → ascending OHLC points (NaN-dated rows dropped). */
export function mapFmpHistorical(hist: FMPHistorical[]): StockOHLCPoint[] {
  return hist
    .map((h) => ({
      time: Math.floor(new Date(h.date).getTime() / 1000),
      open: h.open,
      high: h.high,
      low: h.low,
      close: h.close,
      volume: h.volume,
    }))
    .filter((d) => !Number.isNaN(d.time))
    .sort((a, b) => a.time - b.time);
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
    const data: StockOHLCPoint[] = mapFmpHistorical(body.historical ?? []);

    try { localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); } catch { /* ignore */ }
    return data;
  } catch {
    return [];
  }
}

// ─── Stock performance (derived from OHLC history) ──────────────────────────

export interface StockPerfStats {
  change24h: number;
  change1W?: number;
  change1M?: number;
  change1Y?: number;
}

function findNearestCandle(candles: StockOHLCPoint[], targetSec: number): StockOHLCPoint | undefined {
  return candles.reduce<StockOHLCPoint | undefined>((best, c) => {
    if (!best) return c;
    return Math.abs(c.time - targetSec) < Math.abs(best.time - targetSec) ? c : best;
  }, undefined);
}

/** Derive 1W/1M/1Y % change from sorted OHLC candles + live price. Zero extra API calls. */
export function calcStockPerformance(
  candles: StockOHLCPoint[],
  currentPrice: number,
  change24h: number,
): StockPerfStats {
  if (candles.length === 0) return { change24h };
  const now = Math.floor(Date.now() / 1000);
  const pct = (c?: StockOHLCPoint) =>
    c && c.close > 0 ? ((currentPrice - c.close) / c.close) * 100 : undefined;
  return {
    change24h,
    change1W: pct(findNearestCandle(candles, now - 7 * 86400)),
    change1M: pct(findNearestCandle(candles, now - 30 * 86400)),
    change1Y: pct(findNearestCandle(candles, now - 365 * 86400)),
  };
}

// ─── Analyst ratings ─────────────────────────────────────────────────────────

export interface AnalystRatings {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  consensus: string; // "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell"
}

interface FMPGrade { grade: string; }

export async function getAnalystRatings(symbol: string): Promise<AnalystRatings | null> {
  if (!KEY) return null;
  const ck = `meridian:fmp:grades:${symbol}`;
  try {
    const cached = localStorage.getItem(ck);
    if (cached) {
      const { data, ts } = JSON.parse(cached) as { data: AnalystRatings; ts: number };
      if (Date.now() - ts < 6 * 60 * 60 * 1000) return data;
    }
  } catch { /* ignore */ }

  try {
    const url = `${BASE}/grade/${symbol}?limit=50&apikey=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`FMP grade ${res.status}`);
    const data = (await res.json()) as FMPGrade[];
    if (!Array.isArray(data)) return null;

    const counts = { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 };
    for (const { grade } of data) {
      const g = grade.toLowerCase();
      if (g.includes("strong buy") || g === "outperform" || g === "overweight") counts.strongBuy++;
      else if (g === "buy" || g === "accumulate") counts.buy++;
      else if (g === "hold" || g === "neutral" || g === "equal weight" || g === "sector perform") counts.hold++;
      else if (g === "sell" || g === "underperform" || g === "underweight") counts.sell++;
      else if (g === "strong sell") counts.strongSell++;
    }
    const total = counts.strongBuy + counts.buy + counts.hold + counts.sell + counts.strongSell;
    if (total === 0) return null;

    const bullish = counts.strongBuy + counts.buy;
    const bearish = counts.sell + counts.strongSell;
    let consensus = "Hold";
    if (bullish / total > 0.6) consensus = bullish / total > 0.8 ? "Strong Buy" : "Buy";
    else if (bearish / total > 0.6) consensus = bearish / total > 0.8 ? "Strong Sell" : "Sell";

    const result: AnalystRatings = { ...counts, consensus };
    try { localStorage.setItem(ck, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return null; }
}

// ─── Quarterly financials ────────────────────────────────────────────────────

export interface QuarterlyFinancial {
  quarter: string; // e.g. "Q1 '25"
  revenue: number;
  netIncome: number;
  eps: number;
}

interface FMPIncomeStatement {
  date: string;
  revenue: number;
  netIncome: number;
  eps: number;
}

export async function getFinancialHighlights(symbol: string): Promise<QuarterlyFinancial[]> {
  if (!KEY) return [];
  const ck = `meridian:fmp:income:${symbol}`;
  try {
    const cached = localStorage.getItem(ck);
    if (cached) {
      const { data, ts } = JSON.parse(cached) as { data: QuarterlyFinancial[]; ts: number };
      if (Date.now() - ts < 6 * 60 * 60 * 1000) return data;
    }
  } catch { /* ignore */ }

  try {
    const url = `${BASE}/income-statement/${symbol}?period=quarter&limit=4&apikey=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`FMP income ${res.status}`);
    const data = (await res.json()) as FMPIncomeStatement[];
    if (!Array.isArray(data)) return [];

    const result: QuarterlyFinancial[] = data
      .slice(0, 4)
      .map((s) => {
        const d = new Date(s.date);
        const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} '${String(d.getFullYear()).slice(2)}`;
        return { quarter: q, revenue: s.revenue, netIncome: s.netIncome, eps: s.eps };
      })
      .reverse(); // oldest first for chart
    try { localStorage.setItem(ck, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return []; }
}

// ─── Stock news ──────────────────────────────────────────────────────────────

export interface StockNewsItem {
  title: string;
  publishedDate: string;
  site: string;
  url: string;
}

interface FMPNewsItem {
  title: string;
  publishedDate: string;
  site: string;
  url: string;
}

export async function getStockNews(symbol: string): Promise<StockNewsItem[]> {
  if (!KEY) return [];
  const ck = `meridian:fmp:news:${symbol}`;
  const TTL = 30 * 60 * 1000;
  try {
    const cached = localStorage.getItem(ck);
    if (cached) {
      const { data, ts } = JSON.parse(cached) as { data: StockNewsItem[]; ts: number };
      if (Date.now() - ts < TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const url = `${BASE}/stock_news?tickers=${symbol}&limit=5&apikey=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`FMP news ${res.status}`);
    const data = (await res.json()) as FMPNewsItem[];
    if (!Array.isArray(data)) return [];
    const result = data.slice(0, 5).map((n) => ({
      title: n.title,
      publishedDate: n.publishedDate,
      site: n.site,
      url: n.url,
    }));
    try { localStorage.setItem(ck, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return []; }
}

// ─── Sector performance ──────────────────────────────────────────────────────

export interface SectorData {
  sector: string;
  changesPercentage: number;
}

interface FMPSector {
  sector: string;
  changesPercentage: string; // e.g. "1.23%"
}

export async function getSectorPerformance(): Promise<SectorData[]> {
  if (!KEY) return [];
  const ck = "meridian:fmp:sectors";
  const TTL = 5 * 60 * 1000;
  try {
    const cached = localStorage.getItem(ck);
    if (cached) {
      const { data, ts } = JSON.parse(cached) as { data: SectorData[]; ts: number };
      if (Date.now() - ts < TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const url = `${BASE}/sector-performance?apikey=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`FMP sectors ${res.status}`);
    const data = (await res.json()) as FMPSector[];
    if (!Array.isArray(data)) return [];
    const result = data.map((s) => ({
      sector: s.sector,
      changesPercentage: parseFloat(s.changesPercentage.replace("%", "")),
    }));
    try { localStorage.setItem(ck, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return []; }
}
