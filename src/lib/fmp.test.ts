import { describe, it, expect } from "vitest";
import { mapFmpHistorical } from "./fmp";

describe("mapFmpHistorical", () => {
  it("maps + sorts ascending and keeps volume", () => {
    const out = mapFmpHistorical([
      { date: "2026-01-02", open: 2, high: 3, low: 1, close: 2.5, volume: 200 },
      { date: "2026-01-01", open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
    ]);
    expect(out.map((d) => d.close)).toEqual([1.5, 2.5]);
    expect(out[0].volume).toBe(100);
    expect(out[1].time).toBeGreaterThan(out[0].time);
  });
});
