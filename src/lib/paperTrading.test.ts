import { describe, it, expect } from "vitest";
import { derivePositions } from "./paperTrading";
import type { PaperOrder } from "./paperTrading";

const base: PaperOrder = {
  id: "o1",
  user_id: "u1",
  asset_id: "bitcoin",
  asset_type: "crypto",
  asset_symbol: "BTC",
  asset_name: "Bitcoin",
  side: "buy",
  order_type: "market",
  quantity: 0.1,
  price: null,
  stop_price: null,
  tp_price: null,
  sl_price: null,
  leverage: 1,
  status: "filled",
  filled_price: 50000,
  filled_at: "2024-01-01T00:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
};

describe("derivePositions", () => {
  it("returns empty array for no orders", () => {
    expect(derivePositions([])).toEqual([]);
  });

  it("builds a position from a single buy", () => {
    const [pos] = derivePositions([base]);
    expect(pos.asset_id).toBe("bitcoin");
    expect(pos.quantity).toBeCloseTo(0.1);
    expect(pos.avg_cost).toBeCloseTo(50000);
    expect(pos.total_cost).toBeCloseTo(5000);
  });

  it("ignores pending orders", () => {
    const pending = { ...base, status: "pending" as const, filled_price: null, filled_at: null };
    expect(derivePositions([pending])).toHaveLength(0);
  });

  it("ignores cancelled orders", () => {
    const cancelled = { ...base, status: "cancelled" as const, filled_price: null, filled_at: null };
    expect(derivePositions([cancelled])).toHaveLength(0);
  });

  it("nets out a full sell so the position disappears", () => {
    const sell: PaperOrder = { ...base, id: "o2", side: "sell" };
    expect(derivePositions([base, sell])).toHaveLength(0);
  });

  it("averages cost across two buys at different prices", () => {
    const b1: PaperOrder = { ...base, id: "o1", quantity: 1, filled_price: 40000 };
    const b2: PaperOrder = { ...base, id: "o2", quantity: 1, filled_price: 60000 };
    const [pos] = derivePositions([b1, b2]);
    expect(pos.quantity).toBeCloseTo(2);
    expect(pos.avg_cost).toBeCloseTo(50000);
  });

  it("handles 2× leveraged buy (margin cost is quantity×price/leverage)", () => {
    const leveraged: PaperOrder = { ...base, id: "o1", leverage: 2, quantity: 1, filled_price: 100 };
    const [pos] = derivePositions([leveraged]);
    expect(pos.total_cost).toBeCloseTo(50); // 100 * 1 / 2
    expect(pos.avg_cost).toBeCloseTo(50);
  });

  it("handles two different assets independently", () => {
    const eth: PaperOrder = { ...base, id: "o2", asset_id: "ethereum", asset_symbol: "ETH", filled_price: 3000 };
    const positions = derivePositions([base, eth]);
    expect(positions).toHaveLength(2);
    expect(positions.find((p) => p.asset_id === "bitcoin")?.avg_cost).toBeCloseTo(50000);
    expect(positions.find((p) => p.asset_id === "ethereum")?.avg_cost).toBeCloseTo(3000);
  });
});
