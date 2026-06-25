import { describe, it, expect } from "vitest";
import { klineToPoint } from "./binance";

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
