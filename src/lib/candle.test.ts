import { describe, it, expect } from "vitest";
import { candleStats } from "./candle";

describe("candleStats", () => {
  it("matches the Binance reference candle", () => {
    const s = candleStats({
      open: 114048.94, high: 126199.63, low: 102000.0, close: 109608.01,
    });
    expect(s.chg).toBeCloseTo(-4440.93, 1);
    expect(s.chgPercent).toBeCloseTo(-3.89, 2);
    expect(s.rangePercent).toBeCloseTo(21.22, 2);
  });

  it("is zero-safe when open is 0", () => {
    const s = candleStats({ open: 0, high: 0, low: 0, close: 0 });
    expect(s.chgPercent).toBe(0);
    expect(s.rangePercent).toBe(0);
  });
});
