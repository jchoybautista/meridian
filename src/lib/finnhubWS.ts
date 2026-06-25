import type { Asset } from "../types";

const KEY = import.meta.env.VITE_FINNHUB_KEY as string | undefined;
const WS_URL = KEY ? `wss://ws.finnhub.io?token=${KEY}` : null;

export interface StockTick {
  price: number;
  symbol: string;
}

interface FinnhubTrade { p: number; s: string; t: number; v: number; }
interface FinnhubMsg { data?: FinnhubTrade[]; type: string; }

/** Overlay live Finnhub trade prices onto a stock asset list (pure). */
export function overlayLiveStockTicks(assets: Asset[], live: Map<string, StockTick>): Asset[] {
  if (live.size === 0) return assets;
  return assets.map((a) => {
    const t = live.get(a.symbol);
    return t ? { ...a, price: t.price } : a;
  });
}

/**
 * Open a Finnhub WebSocket for real-time stock trade prices.
 * Updates coalesced to once per second to bound re-renders. Auto-reconnects.
 * Only receives messages during market hours (9:30–16:00 ET weekdays).
 */
export function openStockTickerStream(
  symbols: string[],
  onTick: (bySymbol: Map<string, StockTick>) => void,
): () => void {
  if (!WS_URL || symbols.length === 0) return () => {};

  const latest = new Map<string, StockTick>();
  let dirty = false;
  let ws: WebSocket | null = null;
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  function flush() {
    if (dirty) { dirty = false; onTick(new Map(latest)); }
  }

  function connect() {
    if (closed) return;
    ws = new WebSocket(WS_URL!);

    ws.onopen = () => {
      for (const sym of symbols) {
        ws!.send(JSON.stringify({ type: "subscribe", symbol: sym }));
      }
    };

    ws.onmessage = (e: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(e.data) as FinnhubMsg;
        if (msg.type !== "trade" || !msg.data) return;
        for (const trade of msg.data) {
          latest.set(trade.s, { price: trade.p, symbol: trade.s });
          dirty = true;
        }
      } catch { /* ignore malformed frames */ }
    };

    ws.onerror = () => { ws?.close(); };
    ws.onclose = () => {
      if (!closed) reconnectTimer = setTimeout(connect, 5_000);
    };
  }

  connect();
  flushTimer = setInterval(flush, 1_000);

  return () => {
    closed = true;
    clearInterval(flushTimer!);
    clearTimeout(reconnectTimer!);
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        for (const sym of symbols) {
          ws.send(JSON.stringify({ type: "unsubscribe", symbol: sym }));
        }
      }
      ws.close();
    }
  };
}

/** Single-symbol stream for a stock detail page. */
export function openStockStream(
  symbol: string,
  onTick: (tick: StockTick) => void,
): () => void {
  return openStockTickerStream([symbol], (map) => {
    const t = map.get(symbol);
    if (t) onTick(t);
  });
}
