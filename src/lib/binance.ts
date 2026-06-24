import type { OHLCPoint } from "./coingecko";

// ─── Binance public market-data API ───────────────────────────────────────────
//
// Binance exposes a completely free, no-key public market-data API and matching
// WebSocket streams. We use the `data-api`/`data-stream` "vision" hosts, which
// are the public data-only mirrors (not geo-restricted like api.binance.com).
//
// Why Binance instead of CoinGecko for candles: CoinGecko's free tier now caps
// historical data at the last 365 days, so it cannot show candles back to a
// coin's listing. Binance klines return real OHLC candles at every interval with
// full history (e.g. BTC monthly candles back to Aug 2017), no key, no cost.
//
// Trade-off: prices are USDT-denominated and only coins listed on Binance are
// covered. Callers fall back to CoinGecko (last 365 days) for anything missing.

const REST = "https://data-api.binance.vision/api/v3";
const WS = "wss://data-stream.binance.vision/ws";

/** Map our display interval labels (m = minutes, D = days, W = weeks, M = months)
 *  to Binance's native interval strings (lowercase d/w, uppercase M for month). */
export const BINANCE_INTERVAL: Record<string, string> = {
  "1m": "1m",
  "3m": "3m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "2h": "2h",
  "4h": "4h",
  "6h": "6h",
  "8h": "8h",
  "12h": "12h",
  "1D": "1d",
  "3D": "3d",
  "1W": "1w",
  "1M": "1M",
};

/** Coins whose Binance pair isn't simply `${SYMBOL}USDT`, or that aren't on
 *  Binance at all (mapped to "" so callers fall back to CoinGecko). */
const SYMBOL_OVERRIDES: Record<string, string> = {
  USDT: "", // the quote asset itself — no USDT pair
  USDC: "USDCUSDT",
  STETH: "", // not a Binance spot pair
  WBTC: "WBTCUSDT",
};

/** Binance trading pair for one of our assets, or null if it can't be charted there. */
export function binanceSymbol(symbol: string): string | null {
  const upper = symbol.toUpperCase();
  if (upper in SYMBOL_OVERRIDES) {
    const mapped = SYMBOL_OVERRIDES[upper];
    return mapped === "" ? null : mapped;
  }
  return `${upper}USDT`;
}

type RawKline = [number, string, string, string, string, ...unknown[]];

function klineToPoint(k: RawKline): OHLCPoint {
  return {
    time: Math.floor(k[0] / 1000), // openTime ms → unix seconds
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
  };
}

/**
 * Fetch real OHLC candles for a coin at the given interval.
 * Returns up to `limit` most-recent candles (1000 covers full history for
 * 1W/1M/3D and a multi-year window for 1D). Throws on error so callers can
 * fall back to CoinGecko.
 */
export async function getBinanceKlines(
  symbol: string,
  intervalLabel: string,
  limit = 1000,
): Promise<OHLCPoint[]> {
  const pair = binanceSymbol(symbol);
  if (!pair) throw new Error(`No Binance pair for ${symbol}`);
  const interval = BINANCE_INTERVAL[intervalLabel] ?? "1d";

  const url = `${REST}/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Binance klines ${res.status}`);
  const data = (await res.json()) as RawKline[];
  if (!Array.isArray(data) || data.length === 0) throw new Error("Empty klines");

  // Already ascending by openTime; dedupe defensively.
  const seen = new Set<number>();
  return data
    .map(klineToPoint)
    .filter((p) => {
      if (seen.has(p.time) || Number.isNaN(p.open)) return false;
      seen.add(p.time);
      return true;
    });
}

// ─── Live ticker (24h rolling stats, ~1/sec) ──────────────────────────────────

export interface LiveTicker {
  price: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number; // quote volume (USDT)
}

interface RawTicker {
  c: string; // last price
  P: string; // price change percent
  h: string; // 24h high
  l: string; // 24h low
  q: string; // 24h quote volume
}

function parseTicker(t: RawTicker): LiveTicker {
  return {
    price: parseFloat(t.c),
    changePercent: parseFloat(t.P),
    high24h: parseFloat(t.h),
    low24h: parseFloat(t.l),
    volume24h: parseFloat(t.q),
  };
}

/** One-shot REST ticker fetch (used as immediate seed and polling fallback). */
export async function fetchTicker(symbol: string): Promise<LiveTicker | null> {
  const pair = binanceSymbol(symbol);
  if (!pair) return null;
  try {
    const res = await fetch(`${REST}/ticker/24hr?symbol=${pair}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return parseTicker((await res.json()) as RawTicker);
  } catch {
    return null;
  }
}

/**
 * Subscribe to a live 24h ticker stream for a symbol. Calls `onTick` on every
 * update. Auto-reconnects; if the socket can't stay open it falls back to REST
 * polling every 5 s. Returns a cleanup function.
 */
export function openTickerStream(
  symbol: string,
  onTick: (t: LiveTicker) => void,
): () => void {
  const pair = binanceSymbol(symbol);
  if (!pair) return () => {};

  let ws: WebSocket | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let closed = false;

  const startPolling = () => {
    if (pollTimer) return;
    void fetchTicker(symbol).then((t) => t && onTick(t));
    pollTimer = setInterval(() => {
      void fetchTicker(symbol).then((t) => t && onTick(t));
    }, 5000);
  };

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const connect = () => {
    if (closed) return;
    try {
      ws = new WebSocket(`${WS}/${pair.toLowerCase()}@ticker`);
    } catch {
      startPolling();
      return;
    }

    ws.onopen = () => {
      failures = 0;
      stopPolling(); // WS is live; drop the fallback poll
    };
    ws.onmessage = (ev) => {
      try {
        onTick(parseTicker(JSON.parse(ev.data as string) as RawTicker));
      } catch {
        /* ignore malformed frame */
      }
    };
    ws.onerror = () => ws?.close();
    ws.onclose = () => {
      if (closed) return;
      failures += 1;
      if (failures >= 3) startPolling(); // give up on WS, poll instead
      const delay = Math.min(1000 * failures, 10000);
      reconnectTimer = setTimeout(connect, delay);
    };
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    stopPolling();
    if (ws) {
      ws.onclose = null; // prevent reconnect on intentional close
      ws.close();
    }
  };
}

// ─── Live candle stream (updates the in-progress candle) ──────────────────────

interface RawKlineMsg {
  k: {
    t: number; // open time ms
    o: string;
    h: string;
    l: string;
    c: string;
    x: boolean; // is this candle closed?
  };
}

/**
 * Subscribe to live candle updates for a symbol+interval. `onCandle` fires with
 * the current (possibly still-forming) candle so the chart's last bar updates in
 * real time, and a fresh candle when one closes. Returns a cleanup function.
 */
export function openKlineStream(
  symbol: string,
  intervalLabel: string,
  onCandle: (candle: OHLCPoint, closed: boolean) => void,
): () => void {
  const pair = binanceSymbol(symbol);
  if (!pair) return () => {};
  const interval = BINANCE_INTERVAL[intervalLabel] ?? "1d";

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let closed = false;

  const connect = () => {
    if (closed) return;
    try {
      ws = new WebSocket(`${WS}/${pair.toLowerCase()}@kline_${interval}`);
    } catch {
      return;
    }
    ws.onopen = () => {
      failures = 0;
    };
    ws.onmessage = (ev) => {
      try {
        const { k } = JSON.parse(ev.data as string) as RawKlineMsg;
        onCandle(
          {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
          },
          k.x,
        );
      } catch {
        /* ignore */
      }
    };
    ws.onerror = () => ws?.close();
    ws.onclose = () => {
      if (closed) return;
      failures += 1;
      const delay = Math.min(1000 * failures, 10000);
      reconnectTimer = setTimeout(connect, delay);
    };
  };

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
  };
}
