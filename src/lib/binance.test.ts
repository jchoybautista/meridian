import { describe, it, expect } from "vitest";
import { klineToPoint, overlayLiveTickers, type LiveTicker } from "./binance";
import type { Asset } from "../types";

describe("klineToPoint", () => {
  it("maps a raw kline array including base and quote volume", () => {
    // [openTime, open, high, low, close, baseVol, closeTime, quoteVol, ...]
    const raw = [
      1_696_118_400_000, "114048.94", "126199.63", "102000.00", "109608.01",
      "720300.29", 1_698_796_799_999, "81900000000", 81_900_000, 0, 0, 0,
    ] as const;
    const p = klineToPoint(raw as unknown as Parameters<typeof klineToPoint>[0]);
    expect(p.time).toBe(1_696_118_400);
    expect(p.open).toBeCloseTo(114048.94);
    expect(p.close).toBeCloseTo(109608.01);
    expect(p.volume).toBeCloseTo(720300.29);
    expect(p.quoteVolume).toBeCloseTo(81_900_000_000);
  });
});

const baseAsset = (over: Partial<Asset>): Asset => ({
  id: "x", symbol: "BTC", name: "Bitcoin", type: "crypto",
  price: 100, change24h: 1, ...over,
});

describe("overlayLiveTickers", () => {
  const live = new Map<string, LiveTicker>([
    ["BTC", { price: 200, changePercent: -3, high24h: 210, low24h: 190, volume24h: 5 }],
  ]);

  it("overrides price + change for a live symbol", () => {
    const [a] = overlayLiveTickers([baseAsset({})], live);
    expect(a.price).toBe(200);
    expect(a.change24h).toBe(-3);
    expect(a.high24h).toBe(210);
  });

  it("passes through symbols with no live tick", () => {
    const [a] = overlayLiveTickers([baseAsset({ symbol: "DOGE", price: 1 })], live);
    expect(a.price).toBe(1);
  });
});
