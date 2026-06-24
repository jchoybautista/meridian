import type { Asset } from "../types";

// Built-in fallback market data. Used only when both the live CoinGecko API and
// the local cache are unavailable, so the dashboard always renders something.
// Values are illustrative, not live — the UI flags this as sample data.

interface Seed {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
}

const SEED: Seed[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 60235, change24h: -3.43, change7d: -5.1, marketCap: 1.21e12, volume24h: 29.76e9 },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", price: 1618.55, change24h: -2.35, change7d: -4.2, marketCap: 195e9, volume24h: 9.65e9 },
  { id: "tether", symbol: "USDT", name: "Tether", price: 1.0, change24h: -0.03, change7d: 0.01, marketCap: 110e9, volume24h: 40e9 },
  { id: "binancecoin", symbol: "BNB", name: "BNB", price: 561.18, change24h: -2.18, change7d: -3.0, marketCap: 82e9, volume24h: 1.5e9 },
  { id: "solana", symbol: "SOL", name: "Solana", price: 67.31, change24h: -2.15, change7d: -6.0, marketCap: 30e9, volume24h: 2e9 },
  { id: "usd-coin", symbol: "USDC", name: "USDC", price: 0.9997, change24h: -0.01, change7d: 0.0, marketCap: 34e9, volume24h: 5e9 },
  { id: "ripple", symbol: "XRP", name: "XRP", price: 1.06, change24h: -3.65, change7d: -7.0, marketCap: 58e9, volume24h: 2.5e9 },
  { id: "tron", symbol: "TRX", name: "TRON", price: 0.3272, change24h: -0.67, change7d: -1.0, marketCap: 28e9, volume24h: 0.8e9 },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", price: 0.07, change24h: -4.51, change7d: -8.0, marketCap: 10e9, volume24h: 0.6e9 },
  { id: "cardano", symbol: "ADA", name: "Cardano", price: 0.38, change24h: -2.0, change7d: -5.0, marketCap: 13e9, volume24h: 0.4e9 },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", price: 22, change24h: -3.0, change7d: -6.0, marketCap: 9e9, volume24h: 0.3e9 },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", price: 11, change24h: -2.5, change7d: -4.0, marketCap: 7e9, volume24h: 0.3e9 },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", price: 4.2, change24h: -2.8, change7d: -5.0, marketCap: 6e9, volume24h: 0.2e9 },
  { id: "matic-network", symbol: "MATIC", name: "Polygon", price: 0.45, change24h: -3.2, change7d: -6.0, marketCap: 4.5e9, volume24h: 0.25e9 },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", price: 65, change24h: -1.9, change7d: -3.0, marketCap: 4.9e9, volume24h: 0.4e9 },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu", price: 0.000015, change24h: -4.0, change7d: -9.0, marketCap: 8.8e9, volume24h: 0.3e9 },
  { id: "bitcoin-cash", symbol: "BCH", name: "Bitcoin Cash", price: 188.33, change24h: -0.87, change7d: -2.0, marketCap: 3.7e9, volume24h: 0.2e9 },
  { id: "uniswap", symbol: "UNI", name: "Uniswap", price: 6.5, change24h: -2.1, change7d: -5.0, marketCap: 3.9e9, volume24h: 0.15e9 },
  { id: "stellar", symbol: "XLM", name: "Stellar", price: 0.1, change24h: -2.0, change7d: -4.0, marketCap: 3e9, volume24h: 0.1e9 },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos", price: 6, change24h: -2.4, change7d: -5.0, marketCap: 2.4e9, volume24h: 0.1e9 },
  { id: "monero", symbol: "XMR", name: "Monero", price: 160, change24h: -1.0, change7d: -2.0, marketCap: 3e9, volume24h: 0.08e9 },
  { id: "ethereum-classic", symbol: "ETC", name: "Ethereum Classic", price: 18, change24h: -2.6, change7d: -5.0, marketCap: 2.7e9, volume24h: 0.15e9 },
  { id: "filecoin", symbol: "FIL", name: "Filecoin", price: 3.5, change24h: -3.0, change7d: -6.0, marketCap: 2e9, volume24h: 0.1e9 },
  { id: "aptos", symbol: "APT", name: "Aptos", price: 6, change24h: -3.5, change7d: -7.0, marketCap: 2.8e9, volume24h: 0.12e9 },
];

/** Deterministic 7-day sparkline derived from price and weekly trend. */
function syntheticSparkline(price: number, change7d: number): number[] {
  const points = 40;
  const start = price / (1 + change7d / 100);
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const trend = start + (price - start) * t;
    const wobble = Math.sin(i / 2.5) * price * 0.01;
    out.push(+(trend + wobble).toFixed(price < 1 ? 6 : 2));
  }
  return out;
}

function toAsset(s: Seed, rank: number): Asset {
  return {
    id: s.id,
    symbol: s.symbol,
    name: s.name,
    type: "crypto",
    price: s.price,
    change24h: s.change24h,
    change7d: s.change7d,
    marketCap: s.marketCap,
    volume24h: s.volume24h,
    high24h: s.price * 1.02,
    low24h: s.price * 0.97,
    ath: s.price * 3,
    rank,
    sparkline: syntheticSparkline(s.price, s.change7d),
  };
}

export function seedMarkets(perPage = 100): Asset[] {
  return SEED.slice(0, perPage).map((s, i) => toAsset(s, i + 1));
}

export function seedByIds(ids: string[]): Asset[] {
  return SEED.filter((s) => ids.includes(s.id)).map((s) => toAsset(s, SEED.indexOf(s) + 1));
}

export function seedDetail(id: string): Asset | undefined {
  const idx = SEED.findIndex((s) => s.id === id);
  return idx >= 0 ? toAsset(SEED[idx], idx + 1) : undefined;
}
