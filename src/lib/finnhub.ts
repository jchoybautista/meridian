import type { Asset } from "../types";
import { STOCK_UNIVERSE, seedStock, seedStocks } from "./stockSeed";
import type { StockOHLCPoint } from "./fmp";

const KEY = import.meta.env.VITE_FINNHUB_KEY as string | undefined;
const BASE = "https://finnhub.io/api/v1";
export const finnhubConfigured = Boolean(KEY);

// ─── Quote ───────────────────────────────────────────────────────────────────

interface FinnhubQuote {
  c: number;  // current price
  d: number;  // change
  dp: number; // percent change
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // previous close
}

async function fetchQuote(symbol: string): Promise<Asset | null> {
  const cacheKey = `meridian:fh:quote:${symbol}`;
  const TTL = 45_000;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: Asset; ts: number };
      if (Date.now() - ts < TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch(`${BASE}/quote?symbol=${symbol}&token=${KEY}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Finnhub quote ${res.status}`);
    const q = (await res.json()) as FinnhubQuote;
    if (!q.c || q.c === 0) return null;

    const idx = STOCK_UNIVERSE.findIndex((s) => s.symbol === symbol);
    const seed = seedStock(symbol);
    const asset: Asset = {
      id: symbol,
      symbol,
      name: STOCK_UNIVERSE[idx]?.name ?? symbol,
      type: "stock",
      price: q.c,
      change24h: q.dp,
      high24h: q.h,
      low24h: q.l,
      volume24h: seed?.volume24h,
      marketCap: seed?.marketCap,
      rank: idx >= 0 ? idx + 1 : 999,
      sparkline: seed?.sparkline,
    };

    try { localStorage.setItem(cacheKey, JSON.stringify({ data: asset, ts: Date.now() })); } catch { /* ignore */ }
    return asset;
  } catch {
    return null;
  }
}

// Deduplicate concurrent callers (Dashboard + Portfolio both call this on mount)
let _inFlight: Promise<{ assets: Asset[]; sample: boolean }> | null = null;

export function getFinnhubStockList(): Promise<{ assets: Asset[]; sample: boolean }> {
  if (!KEY) return Promise.resolve({ assets: seedStocks(), sample: true });
  if (_inFlight) return _inFlight;

  _inFlight = _fetchAllQuotes().finally(() => { _inFlight = null; });
  return _inFlight;
}

async function _fetchAllQuotes(): Promise<{ assets: Asset[]; sample: boolean }> {
  const BATCH = 10;
  const DELAY = 1_000; // ms between batches — keeps burst well under 60 req/min
  const symbols = STOCK_UNIVERSE.map((s) => s.symbol);
  const settled: PromiseSettledResult<Asset | null>[] = [];

  for (let i = 0; i < symbols.length; i += BATCH) {
    if (i > 0) await new Promise<void>((r) => setTimeout(r, DELAY));
    const batch = await Promise.allSettled(symbols.slice(i, i + BATCH).map(fetchQuote));
    settled.push(...batch);
  }

  const assets: Asset[] = [];
  settled.forEach((r, i) => {
    const seed = seedStock(STOCK_UNIVERSE[i].symbol);
    if (r.status === "fulfilled" && r.value) {
      assets.push(r.value);
    } else if (seed) {
      assets.push(seed);
    }
  });

  return { assets, sample: false };
}

// ─── Company profile ──────────────────────────────────────────────────────────

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

interface FinnhubProfile2 {
  finnhubIndustry?: string;
  weburl?: string;
  country?: string;
  exchange?: string;
  ipo?: string;
}

interface FinnhubBasicFinancials {
  metric?: {
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    beta?: number;
    peNormalizedAnnual?: number;
    peBasicExclExtraTTM?: number;
    dividendYieldIndicatedAnnual?: number;
    "10DayAverageTradingVolume"?: number;
  };
}

export async function getStockProfile(symbol: string): Promise<StockProfile> {
  if (!KEY) return { description: "" };
  const cacheKey = `meridian:fh:profile:${symbol}`;
  // Profile data changes rarely — cache for 24h
  const TTL = 24 * 60 * 60 * 1000;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: StockProfile; ts: number };
      if (Date.now() - ts < TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const [profRes, finRes] = await Promise.all([
      fetch(`${BASE}/stock/profile2?symbol=${symbol}&token=${KEY}`, { headers: { accept: "application/json" } }),
      fetch(`${BASE}/stock/basic-financials?symbol=${symbol}&metric=all&token=${KEY}`, { headers: { accept: "application/json" } }),
    ]);

    const prof = profRes.ok ? ((await profRes.json()) as FinnhubProfile2) : {};
    const fin = finRes.ok ? ((await finRes.json()) as FinnhubBasicFinancials) : {};
    const m = fin.metric ?? {};

    const profile: StockProfile = {
      description: "",
      industry: prof.finnhubIndustry,
      website: prof.weburl,
      country: prof.country,
      exchange: prof.exchange,
      ipoDate: prof.ipo,
      beta: m.beta,
      pe: m.peNormalizedAnnual ?? m.peBasicExclExtraTTM,
      week52High: m["52WeekHigh"],
      week52Low: m["52WeekLow"],
      avgVolume: m["10DayAverageTradingVolume"],
      dividendYield: m.dividendYieldIndicatedAnnual,
    };

    try { localStorage.setItem(cacheKey, JSON.stringify({ data: profile, ts: Date.now() })); } catch { /* ignore */ }
    return profile;
  } catch {
    return { description: "" };
  }
}

// ─── Analyst ratings ──────────────────────────────────────────────────────────

export interface AnalystRatings {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  consensus: string;
}

interface FinnhubRecommendation {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
}

export async function getAnalystRatings(symbol: string): Promise<AnalystRatings | null> {
  if (!KEY) return null;
  const ck = `meridian:fh:ratings:${symbol}`;
  const TTL = 6 * 60 * 60 * 1000;
  try {
    const raw = localStorage.getItem(ck);
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: AnalystRatings; ts: number };
      if (Date.now() - ts < TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch(`${BASE}/stock/recommendation?symbol=${symbol}&token=${KEY}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Finnhub recommendation ${res.status}`);
    const data = (await res.json()) as FinnhubRecommendation[];
    if (!Array.isArray(data) || data.length === 0) return null;

    const latest = data[0];
    const total = latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell;
    if (total === 0) return null;

    const bullish = latest.strongBuy + latest.buy;
    const bearish = latest.sell + latest.strongSell;
    let consensus = "Hold";
    if (bullish / total > 0.6) consensus = bullish / total > 0.8 ? "Strong Buy" : "Buy";
    else if (bearish / total > 0.6) consensus = bearish / total > 0.8 ? "Strong Sell" : "Sell";

    const result: AnalystRatings = {
      strongBuy: latest.strongBuy,
      buy: latest.buy,
      hold: latest.hold,
      sell: latest.sell,
      strongSell: latest.strongSell,
      consensus,
    };
    try { localStorage.setItem(ck, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return null; }
}

// ─── Financial highlights (annual) ───────────────────────────────────────────

export interface QuarterlyFinancial {
  quarter: string;
  revenue: number;
  netIncome: number;
  eps: number;
}

interface AnnualSeries {
  revenue?: { period: string; v: number }[];
  netIncome?: { period: string; v: number }[];
  epsBasicExclExtraItems?: { period: string; v: number }[];
  eps?: { period: string; v: number }[];
}

export async function getFinancialHighlights(symbol: string): Promise<QuarterlyFinancial[]> {
  if (!KEY) return [];
  const ck = `meridian:fh:financials:${symbol}`;
  const TTL = 6 * 60 * 60 * 1000;
  try {
    const raw = localStorage.getItem(ck);
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: QuarterlyFinancial[]; ts: number };
      if (Date.now() - ts < TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch(
      `${BASE}/stock/basic-financials?symbol=${symbol}&metric=all&token=${KEY}`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`Finnhub financials ${res.status}`);
    const body = (await res.json()) as { series?: { annual?: AnnualSeries } };
    const annual = body.series?.annual;
    if (!annual) return [];

    const revenues = annual.revenue ?? [];
    const incomes = annual.netIncome ?? [];
    const epsList = annual.epsBasicExclExtraItems ?? annual.eps ?? [];

    const result: QuarterlyFinancial[] = revenues.slice(0, 4).map((r, i) => {
      const d = new Date(r.period);
      return {
        quarter: `FY '${String(d.getFullYear()).slice(2)}`,
        revenue: r.v,
        netIncome: incomes[i]?.v ?? 0,
        eps: epsList[i]?.v ?? 0,
      };
    }).reverse();

    try { localStorage.setItem(ck, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return []; }
}

// ─── Company news ─────────────────────────────────────────────────────────────

export interface StockNewsItem {
  title: string;
  publishedDate: string;
  site: string;
  url: string;
}

interface FinnhubNewsItem {
  headline: string;
  datetime: number;
  source: string;
  url: string;
}

export async function getStockNews(symbol: string): Promise<StockNewsItem[]> {
  if (!KEY) return [];
  const ck = `meridian:fh:news:${symbol}`;
  const TTL = 30 * 60 * 1000;
  try {
    const raw = localStorage.getItem(ck);
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: StockNewsItem[]; ts: number };
      if (Date.now() - ts < TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const res = await fetch(
      `${BASE}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${KEY}`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) throw new Error(`Finnhub news ${res.status}`);
    const data = (await res.json()) as FinnhubNewsItem[];
    if (!Array.isArray(data)) return [];

    const result: StockNewsItem[] = data.slice(0, 5).map((n) => ({
      title: n.headline,
      publishedDate: new Date(n.datetime * 1000).toISOString().slice(0, 10),
      site: n.source,
      url: n.url,
    }));
    try { localStorage.setItem(ck, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return []; }
}

// ─── OHLC candles ─────────────────────────────────────────────────────────────

interface FinnhubCandles {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  s: string;
  t: number[];
  v: number[];
}

export async function getFinnhubCandles(
  symbol: string,
  resolution: string,
  fromSec: number,
  toSec: number,
): Promise<StockOHLCPoint[]> {
  if (!KEY) return [];
  const cacheKey = `meridian:fh:candles:${symbol}:${resolution}`;
  const TTL = resolution === "D" || resolution === "W" || resolution === "M"
    ? 60 * 60 * 1000
    : 2 * 60 * 1000;

  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: StockOHLCPoint[]; ts: number };
      if (Date.now() - ts < TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const url = `${BASE}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${fromSec}&to=${toSec}&token=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Finnhub candles ${res.status}`);
    const body = (await res.json()) as FinnhubCandles;
    if (body.s !== "ok" || !body.t?.length) return [];

    const data: StockOHLCPoint[] = body.t.map((t, i) => ({
      time: t,
      open: body.o[i],
      high: body.h[i],
      low: body.l[i],
      close: body.c[i],
      volume: body.v[i],
    }));

    try { localStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); } catch { /* ignore */ }
    return data;
  } catch { return []; }
}

// ─── Sector performance (derived from live quotes) ────────────────────────────

export interface SectorData {
  sector: string;
  changesPercentage: number;
}

export async function getSectorPerformance(): Promise<SectorData[]> {
  const { assets } = await getFinnhubStockList();
  const bySymbol = new Map(assets.map((a) => [a.symbol, a]));
  const sectorChanges = new Map<string, number[]>();

  for (const s of STOCK_UNIVERSE) {
    const asset = bySymbol.get(s.symbol);
    if (!asset || !s.sector) continue;
    const arr = sectorChanges.get(s.sector) ?? [];
    arr.push(asset.change24h);
    sectorChanges.set(s.sector, arr);
  }

  return [...sectorChanges.entries()]
    .map(([sector, changes]) => ({
      sector,
      changesPercentage: changes.reduce((s, c) => s + c, 0) / changes.length,
    }))
    .sort((a, b) => b.changesPercentage - a.changesPercentage);
}
