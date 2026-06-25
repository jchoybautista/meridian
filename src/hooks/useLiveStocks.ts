import { useEffect, useMemo, useState } from "react";
import { openStockTickerStream, overlayLiveStockTicks, type StockTick } from "../lib/finnhubWS";
import { finnhubConfigured } from "../lib/finnhub";
import type { Asset } from "../types";

/**
 * Overlay live Finnhub trade prices onto a stock asset list.
 * Returns live-merged assets plus `isLive` (true once the first trade arrives).
 * Only active during market hours — outside hours the snapshot passes through unchanged.
 */
export function useLiveStocks(
  assets: Asset[],
  enabled = true,
): { assets: Asset[]; isLive: boolean } {
  const [ticks, setTicks] = useState<Map<string, StockTick>>(new Map());

  const symbols = useMemo(() => assets.map((a) => a.symbol), [assets]);
  const key = [...symbols].sort().join(",");

  useEffect(() => {
    if (!enabled || !finnhubConfigured || symbols.length === 0) {
      setTicks(new Map());
      return;
    }
    return openStockTickerStream(symbols, setTicks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const merged = useMemo(() => overlayLiveStockTicks(assets, ticks), [assets, ticks]);

  return { assets: merged, isLive: ticks.size > 0 };
}
