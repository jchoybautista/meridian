export type AssetType = "crypto" | "stock";

/** Normalised asset used across cards, tables, and detail pages. */
export interface Asset {
  /** Stable identifier. CoinGecko id for crypto (e.g. "bitcoin"); ticker for stocks. */
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  price: number;
  change24h: number; // percent
  change7d?: number; // percent, crypto only
  marketCap?: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  ath?: number;
  image?: string;
  rank?: number;
  /** 7-day price points for mini sparkline charts. */
  sparkline?: number[];
}

/** A single point on a price-history chart. */
export interface PricePoint {
  time: number; // unix ms
  price: number;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  asset_symbol: string;
  asset_name: string;
  asset_type: AssetType;
  asset_id: string | null;
  created_at: string;
}

export interface PortfolioHolding {
  id: string;
  user_id: string;
  asset_symbol: string;
  asset_name: string;
  asset_type: AssetType;
  asset_id: string | null;
  quantity: number;
  created_at: string;
}
