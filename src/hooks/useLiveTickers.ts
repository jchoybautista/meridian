import { useEffect, useRef, useState } from "react";
import { openMultiTickerStream, type LiveTicker } from "../lib/binance";

/**
 * Live 24h tickers for a set of symbols via one Binance combined WebSocket.
 * Returns a symbol→ticker map that updates at most once per second.
 */
export function useLiveTickers(symbols: string[], enabled = true): Map<string, LiveTicker> {
  const [tickers, setTickers] = useState<Map<string, LiveTicker>>(new Map());
  // Stable key so the effect only re-subscribes when the symbol set changes.
  const key = symbols.map((s) => s.toUpperCase()).sort().join(",");
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  useEffect(() => {
    if (!enabled || key === "") { setTickers(new Map()); return; }
    return openMultiTickerStream(symbolsRef.current, setTickers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return tickers;
}
