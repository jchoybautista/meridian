import type { Asset } from "../types";

// Curated universe of ~40 well-known stocks with built-in sample data. The free
// stock API (Alpha Vantage) has no bulk endpoint and only 25 calls/day, so the
// list view uses this seed and live quotes are fetched per-symbol on demand.

interface Seed {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

const SEED: Seed[] = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", price: 229.35, change24h: 1.24, marketCap: 3.5e12, volume24h: 52e6 },
  { symbol: "MSFT", name: "Microsoft Corporation", sector: "Technology", price: 441.13, change24h: 0.52, marketCap: 3.3e12, volume24h: 18e6 },
  { symbol: "NVDA", name: "NVIDIA Corporation", sector: "Technology", price: 139.91, change24h: 3.07, marketCap: 3.4e12, volume24h: 240e6 },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Communication Services", price: 178.42, change24h: 0.86, marketCap: 2.2e12, volume24h: 22e6 },
  { symbol: "AMZN", name: "Amazon.com, Inc.", sector: "Consumer Discretionary", price: 201.67, change24h: -0.43, marketCap: 2.1e12, volume24h: 35e6 },
  { symbol: "META", name: "Meta Platforms, Inc.", sector: "Communication Services", price: 583.24, change24h: 1.78, marketCap: 1.5e12, volume24h: 14e6 },
  { symbol: "TSLA", name: "Tesla, Inc.", sector: "Consumer Discretionary", price: 412.8, change24h: -2.15, marketCap: 1.3e12, volume24h: 95e6 },
  { symbol: "BRK-B", name: "Berkshire Hathaway", sector: "Financials", price: 455.1, change24h: 0.31, marketCap: 0.98e12, volume24h: 4e6 },
  { symbol: "LLY", name: "Eli Lilly and Company", sector: "Healthcare", price: 890.4, change24h: 0.94, marketCap: 0.85e12, volume24h: 3e6 },
  { symbol: "AVGO", name: "Broadcom Inc.", sector: "Technology", price: 1700.2, change24h: 2.1, marketCap: 0.79e12, volume24h: 2.5e6 },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Financials", price: 220.5, change24h: 0.42, marketCap: 0.63e12, volume24h: 9e6 },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Staples", price: 78.2, change24h: 0.55, marketCap: 0.63e12, volume24h: 17e6 },
  { symbol: "V", name: "Visa Inc.", sector: "Financials", price: 285.6, change24h: 0.61, marketCap: 0.58e12, volume24h: 6e6 },
  { symbol: "XOM", name: "Exxon Mobil Corporation", sector: "Energy", price: 118.3, change24h: -0.82, marketCap: 0.52e12, volume24h: 15e6 },
  { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare", price: 520.7, change24h: 0.18, marketCap: 0.48e12, volume24h: 3e6 },
  { symbol: "ORCL", name: "Oracle Corporation", sector: "Technology", price: 178.9, change24h: 1.52, marketCap: 0.49e12, volume24h: 8e6 },
  { symbol: "MA", name: "Mastercard Incorporated", sector: "Financials", price: 480.3, change24h: 0.68, marketCap: 0.45e12, volume24h: 3e6 },
  { symbol: "COST", name: "Costco Wholesale", sector: "Consumer Staples", price: 880.1, change24h: 1.12, marketCap: 0.39e12, volume24h: 2e6 },
  { symbol: "NFLX", name: "Netflix, Inc.", sector: "Communication Services", price: 912.45, change24h: -1.12, marketCap: 0.39e12, volume24h: 4e6 },
  { symbol: "PG", name: "Procter & Gamble", sector: "Consumer Staples", price: 168.4, change24h: 0.27, marketCap: 0.39e12, volume24h: 6e6 },
  { symbol: "HD", name: "The Home Depot", sector: "Consumer Discretionary", price: 385.2, change24h: 0.91, marketCap: 0.38e12, volume24h: 3e6 },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", price: 158.1, change24h: 0.12, marketCap: 0.38e12, volume24h: 7e6 },
  { symbol: "BAC", name: "Bank of America", sector: "Financials", price: 42.3, change24h: 0.48, marketCap: 0.32e12, volume24h: 35e6 },
  { symbol: "CRM", name: "Salesforce, Inc.", sector: "Technology", price: 290.6, change24h: 1.03, marketCap: 0.28e12, volume24h: 5e6 },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology", price: 165.2, change24h: 2.51, marketCap: 0.27e12, volume24h: 45e6 },
  { symbol: "KO", name: "The Coca-Cola Company", sector: "Consumer Staples", price: 62.1, change24h: 0.2, marketCap: 0.27e12, volume24h: 12e6 },
  { symbol: "ADBE", name: "Adobe Inc.", sector: "Technology", price: 560.4, change24h: 0.82, marketCap: 0.25e12, volume24h: 2.5e6 },
  { symbol: "PEP", name: "PepsiCo, Inc.", sector: "Consumer Staples", price: 168.7, change24h: -0.13, marketCap: 0.23e12, volume24h: 5e6 },
  { symbol: "CSCO", name: "Cisco Systems", sector: "Technology", price: 56.2, change24h: 0.34, marketCap: 0.22e12, volume24h: 16e6 },
  { symbol: "MCD", name: "McDonald's Corporation", sector: "Consumer Discretionary", price: 295.3, change24h: 0.41, marketCap: 0.21e12, volume24h: 3e6 },
  { symbol: "GE", name: "GE Aerospace", sector: "Industrials", price: 185.6, change24h: 0.83, marketCap: 0.2e12, volume24h: 4e6 },
  { symbol: "IBM", name: "IBM", sector: "Technology", price: 215.4, change24h: 0.62, marketCap: 0.2e12, volume24h: 4e6 },
  { symbol: "DIS", name: "The Walt Disney Company", sector: "Communication Services", price: 112.2, change24h: 0.74, marketCap: 0.2e12, volume24h: 9e6 },
  { symbol: "TXN", name: "Texas Instruments", sector: "Technology", price: 205.1, change24h: 0.53, marketCap: 0.19e12, volume24h: 5e6 },
  { symbol: "QCOM", name: "QUALCOMM Incorporated", sector: "Technology", price: 165.8, change24h: 1.21, marketCap: 0.18e12, volume24h: 7e6 },
  { symbol: "PFE", name: "Pfizer Inc.", sector: "Healthcare", price: 28.4, change24h: -0.42, marketCap: 0.16e12, volume24h: 30e6 },
  { symbol: "UBER", name: "Uber Technologies", sector: "Industrials", price: 72.3, change24h: 1.54, marketCap: 0.15e12, volume24h: 14e6 },
  { symbol: "INTC", name: "Intel Corporation", sector: "Technology", price: 32.1, change24h: -1.53, marketCap: 0.14e12, volume24h: 40e6 },
  { symbol: "NKE", name: "NIKE, Inc.", sector: "Consumer Discretionary", price: 78.4, change24h: -0.61, marketCap: 0.12e12, volume24h: 8e6 },
  { symbol: "BA", name: "The Boeing Company", sector: "Industrials", price: 180.2, change24h: -1.02, marketCap: 0.11e12, volume24h: 6e6 },
  { symbol: "PYPL", name: "PayPal Holdings", sector: "Financials", price: 78.1, change24h: 1.32, marketCap: 0.08e12, volume24h: 11e6 },
];

/** Deterministic sparkline trending roughly with the 24h change. */
function syntheticSparkline(price: number, change24h: number): number[] {
  const points = 40;
  const weekTrend = change24h * 1.8; // approximate 7d drift
  const start = price / (1 + weekTrend / 100);
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const trend = start + (price - start) * t;
    const wobble = Math.sin(i / 2.3) * price * 0.008;
    out.push(+(trend + wobble).toFixed(2));
  }
  return out;
}

function toAsset(s: Seed, rank: number): Asset {
  return {
    id: s.symbol,
    symbol: s.symbol,
    name: s.name,
    type: "stock",
    price: s.price,
    change24h: s.change24h,
    marketCap: s.marketCap,
    volume24h: s.volume24h,
    high24h: s.price * 1.012,
    low24h: s.price * 0.988,
    rank,
    sparkline: syntheticSparkline(s.price, s.change24h),
  };
}

export const STOCK_UNIVERSE = SEED.map((s) => ({ symbol: s.symbol, name: s.name, sector: s.sector }));

export function seedStocks(): Asset[] {
  return SEED.map((s, i) => toAsset(s, i + 1));
}

export function seedStock(symbol: string): Asset | undefined {
  const idx = SEED.findIndex((s) => s.symbol === symbol);
  return idx >= 0 ? toAsset(SEED[idx], idx + 1) : undefined;
}
