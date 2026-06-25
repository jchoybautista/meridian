import { useMemo } from "react";
import { overlayLiveTickers } from "../lib/binance";
import { useLiveTickers } from "./useLiveTickers";
import type { Asset } from "../types";

/**
 * Overlay live Binance ticks onto a crypto asset list. Returns the live-merged
 * assets plus `isLive` (true once any tick has arrived) for a "Live" indicator.
 */
export function useLiveAssets(
  assets: Asset[],
  enabled = true,
): { assets: Asset[]; isLive: boolean } {
  const symbols = useMemo(() => assets.map((a) => a.symbol), [assets]);
  const live = useLiveTickers(symbols, enabled);
  const merged = useMemo(() => overlayLiveTickers(assets, live), [assets, live]);
  return { assets: merged, isLive: live.size > 0 };
}
