import type { OHLCPoint } from "./coingecko";
import type { Asset } from "../types";

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
const STREAM = "wss://data-stream.binance.vision/stream";

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

export function klineToPoint(k: RawKline): OHLCPoint {
  return {
    time: Math.floor(k[0] / 1000), // openTime ms → unix seconds
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5] as string),
    quoteVolume: parseFloat(k[7] as string),
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

/**
 * Return a new asset list with live price/24h-change (and high/low/volume when
 * present) overlaid from a symbol→ticker map. Assets without a live tick — and
 * those not on Binance — pass through unchanged. Pure; safe to memoize.
 */
export function overlayLiveTickers(
  assets: Asset[],
  live: Map<string, LiveTicker>,
): Asset[] {
  if (live.size === 0) return assets;
  return assets.map((a) => {
    const t = live.get(a.symbol.toUpperCase());
    if (!t) return a;
    return {
      ...a,
      price: t.price,
      change24h: t.changePercent,
      high24h: t.high24h ?? a.high24h,
      low24h: t.low24h ?? a.low24h,
      volume24h: t.volume24h ?? a.volume24h,
    };
  });
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

// ─── Multi-symbol live ticker stream (one socket for many symbols) ────────────

/**
 * One WebSocket carrying live 24h tickers for many symbols. `onTick` receives a
 * symbol→ticker map at most once per second (coalesced to bound re-renders).
 * Falls back to batched REST polling if the socket can't stay open. Returns a
 * cleanup function.
 */
export function openMultiTickerStream(
  symbols: string[],
  onTick: (bySymbol: Map<string, LiveTicker>) => void,
): () => void {
  // our symbol ↔ binance pair (lowercase), skipping coins not on Binance
  const pairToSymbol = new Map<string, string>();
  for (const s of symbols) {
    const pair = binanceSymbol(s);
    if (pair) pairToSymbol.set(pair.toLowerCase(), s.toUpperCase());
  }
  if (pairToSymbol.size === 0) return () => {};

  const latest = new Map<string, LiveTicker>();
  let dirty = false;
  let ws: WebSocket | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let closed = false;

  const flushTimer = setInterval(() => {
    if (dirty) {
      dirty = false;
      onTick(new Map(latest));
    }
  }, 1000);

  const pairs = [...pairToSymbol.keys()];

  const startPolling = () => {
    if (pollTimer) return;
    const poll = () => {
      void Promise.all(
        [...pairToSymbol.values()].map(async (sym) => {
          const t = await fetchTicker(sym);
          if (t) { latest.set(sym, t); dirty = true; }
        }),
      );
    };
    poll();
    pollTimer = setInterval(poll, 5000);
  };
  const stopPolling = () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  };

  const connect = () => {
    if (closed) return;
    const url = `${STREAM}?streams=${pairs.map((p) => `${p}@ticker`).join("/")}`;
    try {
      ws = new WebSocket(url);
    } catch {
      startPolling();
      return;
    }
    ws.onopen = () => { failures = 0; stopPolling(); };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { stream?: string; data?: RawTicker };
        if (!msg.stream || !msg.data) return;
        const pair = msg.stream.replace("@ticker", "");
        const sym = pairToSymbol.get(pair);
        if (!sym) return;
        latest.set(sym, parseTicker(msg.data));
        dirty = true;
      } catch { /* ignore malformed frame */ }
    };
    ws.onerror = () => ws?.close();
    ws.onclose = () => {
      if (closed) return;
      failures += 1;
      if (failures >= 3) startPolling();
      reconnectTimer = setTimeout(connect, Math.min(1000 * failures, 10000));
    };
  };

  connect();

  return () => {
    closed = true;
    clearInterval(flushTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    stopPolling();
    if (ws) { ws.onclose = null; ws.close(); }
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
    v: string; // base volume
    q: string; // quote volume
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
            volume: parseFloat(k.v),
            quoteVolume: parseFloat(k.q),
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

// ─── Order Book ───────────────────────────────────────────────────────────────

export interface DepthLevel {
  price: number;
  quantity: number;
}

export interface DepthBook {
  bids: DepthLevel[]; // sorted desc — highest bid first
  asks: DepthLevel[]; // sorted asc — lowest ask first
}

/**
 * Subscribes to Binance's 20-level depth stream for `symbol` at 100 ms updates.
 * Returns a cleanup function. Reconnects automatically on close.
 * If the symbol has no Binance pair, returns a no-op cleanup immediately.
 */
export function openDepthStream(
  symbol: string,
  onUpdate: (book: DepthBook) => void,
): () => void {
  const pair = binanceSymbol(symbol);
  if (!pair) return () => {};

  const url = `${WS}/${pair.toLowerCase()}@depth20@100ms`;
  let ws: WebSocket | null = null;
  let closed = false;

  function connect() {
    if (closed) return;
    ws = new WebSocket(url);
    ws.onmessage = (evt) => {
      try {
        const raw = JSON.parse(evt.data as string) as {
          bids: [string, string][];
          asks: [string, string][];
        };
        onUpdate({
          bids: raw.bids.slice(0, 10).map(([p, q]) => ({ price: +p, quantity: +q })),
          asks: raw.asks.slice(0, 10).map(([p, q]) => ({ price: +p, quantity: +q })),
        });
      } catch { /* ignore malformed frames */ }
    };
    ws.onerror = () => {};
    ws.onclose = () => { if (!closed) setTimeout(connect, 3000); };
  }

  connect();
  return () => { closed = true; ws?.close(); };
}

/** Deterministic hash in [0, 1) — safe against float overflow for typical seeds. */
function pseudoRand(n: number): number {
  return (Math.abs(Math.sin(n)) * 10000) % 1;
}

/**
 * Builds a 10-level simulated order book for stocks (or as a crypto fallback).
 * `seed` should be `Math.floor(Date.now() / 2000)` to jitter every 2 seconds.
 */
export function buildSimulatedBook(currentPrice: number, seed: number): DepthBook {
  const asks: DepthLevel[] = [];
  const bids: DepthLevel[] = [];
  for (let i = 0; i < 10; i++) {
    const spread = currentPrice * (0.0005 + i * 0.0003);
    asks.push({ price: currentPrice + spread, quantity: 50 + Math.floor(pseudoRand(seed + i * 13) * 900) });
    bids.push({ price: currentPrice - spread, quantity: 50 + Math.floor(pseudoRand(seed + i * 17 + 50) * 900) });
  }
  asks.sort((a, b) => a.price - b.price);
  bids.sort((a, b) => b.price - a.price);
  return { asks, bids };
}
