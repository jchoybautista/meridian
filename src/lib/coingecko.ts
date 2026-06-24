import type { Asset, PricePoint } from "../types";
import { seedByIds, seedDetail, seedMarkets } from "./cryptoSeed";

const BASE = "https://api.coingecko.com/api/v3";

/**
 * True once any crypto request has fallen back to cached or seed data because
 * the live API was unavailable. Lets the UI show a subtle "sample data" note.
 */
export let cryptoDegraded = false;

interface CGMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  ath: number;
  sparkline_in_7d?: { price: number[] };
}

function toAsset(m: CGMarket): Asset {
  return {
    id: m.id,
    symbol: m.symbol.toUpperCase(),
    name: m.name,
    type: "crypto",
    price: m.current_price,
    change24h: m.price_change_percentage_24h ?? 0,
    change7d: m.price_change_percentage_7d_in_currency,
    marketCap: m.market_cap,
    volume24h: m.total_volume,
    high24h: m.high_24h,
    low24h: m.low_24h,
    ath: m.ath,
    image: m.image,
    rank: m.market_cap_rank,
    sparkline: m.sparkline_in_7d?.price,
  };
}

const CACHE_PREFIX = "meridian:cg:";

function readCache<T>(url: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + url);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache(url: string, data: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + url, JSON.stringify(data));
  } catch {
    /* storage full or unavailable — ignore */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch + parse JSON from CoinGecko with one retry and a localStorage cache.
 * On a successful response the result is cached; if the network fails or the
 * API rate-limits, the last cached response is returned instead. Throws only
 * when there is no cache to fall back to — callers may then use seed data.
 */
async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.status === 429) {
        const cached = readCache<T>(url);
        if (cached) return cached;
        await sleep(800);
        continue;
      }
      if (!res.ok) throw new Error(`CoinGecko request failed (${res.status})`);
      const data = (await res.json()) as T;
      writeCache(url, data);
      return data;
    } catch (err) {
      const cached = readCache<T>(url);
      if (cached) return cached;
      if (attempt === 1) throw err instanceof Error ? err : new Error("Network error");
      await sleep(600);
    }
  }
  const cached = readCache<T>(url);
  if (cached) return cached;
  throw new Error("Unable to load market data.");
}

/** Top crypto markets by market cap. Pass `sparkline` for 7-day price arrays. */
export async function getCryptoMarkets(
  perPage = 100,
  page = 1,
  sparkline = false,
): Promise<Asset[]> {
  const url =
    `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc` +
    `&per_page=${perPage}&page=${page}&price_change_percentage=24h,7d&sparkline=${sparkline}`;
  try {
    const data = await getJson<CGMarket[]>(url);
    return data.map(toAsset);
  } catch {
    cryptoDegraded = true;
    return seedMarkets(perPage);
  }
}

/** Specific coins by id (for dashboard highlights). */
export async function getCryptoByIds(ids: string[]): Promise<Asset[]> {
  const url =
    `${BASE}/coins/markets?vs_currency=usd&ids=${ids.join(",")}` +
    `&order=market_cap_desc&price_change_percentage=24h,7d&sparkline=false`;
  try {
    const data = await getJson<CGMarket[]>(url);
    return data.map(toAsset);
  } catch {
    cryptoDegraded = true;
    return seedByIds(ids);
  }
}

/** A single coin's full detail. */
export async function getCryptoDetail(id: string): Promise<Asset> {
  try {
    const [asset] = await getCryptoByIds([id]);
    if (asset) return asset;
  } catch {
    /* fall through to seed */
  }
  const seeded = seedDetail(id);
  if (seeded) {
    cryptoDegraded = true;
    return seeded;
  }
  throw new Error(`Crypto "${id}" not found.`);
}

/** Price history for charts. `days` = 1, 7, 30, etc. */
export async function getCryptoChart(id: string, days = 7): Promise<PricePoint[]> {
  const url = `${BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}`;
  try {
    const data = await getJson<{ prices: [number, number][] }>(url);
    return data.prices.map(([time, price]) => ({ time, price }));
  } catch {
    // Build a chart from the seed sparkline so the detail page still renders.
    const seeded = seedDetail(id);
    if (!seeded?.sparkline) throw new Error("Unable to load price history.");
    cryptoDegraded = true;
    const now = Date.now();
    const step = (days * 86_400_000) / seeded.sparkline.length;
    return seeded.sparkline.map((price, i) => ({
      time: now - (seeded.sparkline!.length - i) * step,
      price,
    }));
  }
}

/** One OHLC candle. `time` is unix seconds (required by lightweight-charts). */
export interface OHLCPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Descriptive info about a coin (separate heavier call, cached). */
export interface CryptoInfo {
  description: string;
  homepage?: string;
  categories: string[];
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  atl?: number;
  atlDate?: string;
  athDate?: string;
  genesisDate?: string;
  change7d?: number;
  change30d?: number;
  change1y?: number;
}

/**
 * OHLC candlestick data for a coin.
 * CoinGecko free granularity: days=1 → 30min, days≤30 → 4h, days≤365 → daily, days='max' → weekly (full history).
 */
export async function getCryptoOHLC(id: string, days: number | "max"): Promise<OHLCPoint[]> {
  const url = `${BASE}/coins/${id}/ohlc?vs_currency=usd&days=${days}`;
  try {
    const data = await getJson<[number, number, number, number, number][]>(url);
    const seen = new Set<number>();
    return data
      .map(([t, o, h, l, c]) => ({ time: Math.floor(t / 1000), open: o, high: h, low: l, close: c }))
      .filter(({ time }) => {
        if (seen.has(time)) return false;
        seen.add(time);
        return true;
      })
      .sort((a, b) => a.time - b.time);
  } catch {
    // Synthetic fallback: generate OHLC from market_chart (only works for numeric days)
    try {
      const numDays = days === "max" ? 365 : days;
      const pts = await getCryptoChart(id, numDays);
      if (pts.length === 0) return [];
      const bucketSize = Math.max(1, Math.floor(pts.length / 60));
      const candles: OHLCPoint[] = [];
      for (let i = 0; i < pts.length; i += bucketSize) {
        const bucket = pts.slice(i, i + bucketSize);
        const prices = bucket.map((p) => p.price);
        candles.push({
          time: Math.floor(bucket[0].time / 1000),
          open: prices[0],
          close: prices[prices.length - 1],
          high: Math.max(...prices),
          low: Math.min(...prices),
        });
      }
      return candles;
    } catch {
      return [];
    }
  }
}

/** Full coin details: description, supply, ATL, price changes, genesis date. Falls back gracefully. */
export async function getCryptoInfo(id: string): Promise<CryptoInfo> {
  const url =
    `${BASE}/coins/${id}?localization=false&tickers=false` +
    `&market_data=true&community_data=false&developer_data=false`;
  try {
    const data = await getJson<{
      description?: { en?: string };
      links?: { homepage?: string[] };
      categories?: string[];
      genesis_date?: string | null;
      market_data?: {
        circulating_supply?: number;
        total_supply?: number;
        max_supply?: number;
        atl?: { usd?: number };
        atl_date?: { usd?: string };
        ath_date?: { usd?: string };
        price_change_percentage_7d?: number;
        price_change_percentage_30d?: number;
        price_change_percentage_1y?: number;
      };
    }>(url);

    const raw = data.description?.en ?? "";
    const description = raw.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim();

    return {
      description,
      homepage: data.links?.homepage?.find((h) => h.startsWith("http")),
      categories: data.categories?.slice(0, 6) ?? [],
      circulatingSupply: data.market_data?.circulating_supply,
      totalSupply: data.market_data?.total_supply,
      maxSupply: data.market_data?.max_supply,
      atl: data.market_data?.atl?.usd,
      atlDate: data.market_data?.atl_date?.usd,
      athDate: data.market_data?.ath_date?.usd,
      genesisDate: data.genesis_date ?? undefined,
      change7d: data.market_data?.price_change_percentage_7d,
      change30d: data.market_data?.price_change_percentage_30d,
      change1y: data.market_data?.price_change_percentage_1y,
    };
  } catch {
    return { description: "", categories: [] };
  }
}

export interface CryptoSearchResult {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
}

/** Search coins by name/symbol. */
export async function searchCrypto(query: string): Promise<CryptoSearchResult[]> {
  if (!query.trim()) return [];
  const url = `${BASE}/search?query=${encodeURIComponent(query)}`;
  const data = await getJson<{ coins: CryptoSearchResult[] }>(url);
  return data.coins.slice(0, 10);
}

/** Global market stats for the dashboard summary bar. */
export interface DominanceSlice {
  symbol: string;
  percent: number;
}

/**
 * Derive a dominance breakdown from an already-loaded markets list. Used as a
 * resilient fallback so the dominance chart renders even if /global is
 * rate-limited. Percentages are relative to the supplied assets' total cap.
 */
export function computeDominance(assets: Asset[]): DominanceSlice[] {
  const withCap = assets.filter((a) => a.marketCap && a.marketCap > 0);
  const total = withCap.reduce((sum, a) => sum + (a.marketCap ?? 0), 0);
  if (total === 0) return [];
  const named = withCap.slice(0, 6).map((a) => ({
    symbol: a.symbol,
    percent: ((a.marketCap ?? 0) / total) * 100,
  }));
  const othersPercent = 100 - named.reduce((s, d) => s + d.percent, 0);
  if (othersPercent > 0.5) named.push({ symbol: "Others", percent: othersPercent });
  return named;
}

export interface GlobalStats {
  totalMarketCap: number;
  marketCapChange24h: number;
  btcDominance: number;
  /** Market-cap share per coin (top coins + an "Others" remainder). */
  dominance: DominanceSlice[];
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const data = await getJson<{
    data: {
      total_market_cap: { usd: number };
      market_cap_change_percentage_24h_usd: number;
      market_cap_percentage: Record<string, number>;
    };
  }>(`${BASE}/global`);

  const pct = data.data.market_cap_percentage;
  const slices: DominanceSlice[] = Object.entries(pct).map(([symbol, percent]) => ({
    symbol: symbol.toUpperCase(),
    percent,
  }));
  const named = slices.slice(0, 6);
  const othersPercent = 100 - named.reduce((sum, s) => sum + s.percent, 0);
  if (othersPercent > 0.5) named.push({ symbol: "Others", percent: othersPercent });

  return {
    totalMarketCap: data.data.total_market_cap.usd,
    marketCapChange24h: data.data.market_cap_change_percentage_24h_usd,
    btcDominance: pct.btc ?? 0,
    dominance: named,
  };
}
