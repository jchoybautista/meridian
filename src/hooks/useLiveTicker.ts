import { useEffect, useState } from "react";
import { openTickerStream, type LiveTicker } from "../lib/binance";

/**
 * Live 24h ticker (price, change, high/low/volume) for a crypto symbol via
 * Binance's free WebSocket stream, so the page updates without a refresh.
 * Returns null until the first tick arrives (or for non-Binance symbols).
 */
export function useLiveTicker(symbol: string | undefined, enabled = true): LiveTicker | null {
  const [ticker, setTicker] = useState<LiveTicker | null>(null);

  useEffect(() => {
    setTicker(null);
    if (!symbol || !enabled) return;
    return openTickerStream(symbol, setTicker);
  }, [symbol, enabled]);

  return ticker;
}
