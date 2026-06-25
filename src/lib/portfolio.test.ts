import { describe, it, expect } from "vitest";
import { deriveHoldings, portfolioSummary } from "./portfolio";
import type { Transaction } from "../types";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "1", user_id: "u", asset_id: "bitcoin", asset_symbol: "BTC",
    asset_name: "Bitcoin", asset_type: "crypto", type: "buy",
    quantity: 1, price_per_unit: 30000, transacted_at: "2024-01-01",
    notes: null, created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const priceMap = { bitcoin: { price: 40000, change24h: 2 } };

describe("deriveHoldings", () => {
  it("buy only — quantity and avgCost are correct", () => {
    const txns: Transaction[] = [
      tx({ id: "1", quantity: 1, price_per_unit: 30000, transacted_at: "2024-01-01" }),
      tx({ id: "2", quantity: 2, price_per_unit: 45000, transacted_at: "2024-02-01" }),
    ];
    const [h] = deriveHoldings(txns, priceMap);
    expect(h.quantity).toBeCloseTo(3);
    expect(h.avgCost).toBeCloseTo((30000 + 90000) / 3);
    expect(h.realizedPnL).toBe(0);
    expect(h.unrealizedPnL).toBeCloseTo((40000 - h.avgCost) * 3);
  });

  it("sell consumes FIFO lots and records realized gain", () => {
    const txns: Transaction[] = [
      tx({ id: "1", type: "buy",  quantity: 2, price_per_unit: 30000, transacted_at: "2024-01-01" }),
      tx({ id: "2", type: "sell", quantity: 1, price_per_unit: 50000, transacted_at: "2024-03-01" }),
    ];
    const [h] = deriveHoldings(txns, priceMap);
    expect(h.quantity).toBeCloseTo(1);
    expect(h.realizedPnL).toBeCloseTo(20000); // (50000 - 30000) × 1
    expect(h.avgCost).toBeCloseTo(30000);      // remaining lot cost
  });

  it("partial lot sell — remaining lot qty correct", () => {
    const txns: Transaction[] = [
      tx({ id: "1", type: "buy",  quantity: 3, price_per_unit: 20000, transacted_at: "2024-01-01" }),
      tx({ id: "2", type: "sell", quantity: 1, price_per_unit: 25000, transacted_at: "2024-02-01" }),
    ];
    const [h] = deriveHoldings(txns, priceMap);
    expect(h.quantity).toBeCloseTo(2);
    expect(h.realizedPnL).toBeCloseTo(5000);
    expect(h.avgCost).toBeCloseTo(20000);
  });

  it("oversell beyond held qty — no crash, holding excluded", () => {
    const txns: Transaction[] = [
      tx({ id: "1", type: "buy",  quantity: 1, price_per_unit: 30000, transacted_at: "2024-01-01" }),
      tx({ id: "2", type: "sell", quantity: 5, price_per_unit: 50000, transacted_at: "2024-02-01" }),
    ];
    const holdings = deriveHoldings(txns, priceMap);
    expect(holdings).toHaveLength(0);
  });

  it("asset with quantity 0 is excluded from holdings", () => {
    const txns: Transaction[] = [
      tx({ id: "1", type: "buy",  quantity: 1, price_per_unit: 30000, transacted_at: "2024-01-01" }),
      tx({ id: "2", type: "sell", quantity: 1, price_per_unit: 50000, transacted_at: "2024-02-01" }),
    ];
    const holdings = deriveHoldings(txns, priceMap);
    expect(holdings).toHaveLength(0);
  });
});

describe("portfolioSummary", () => {
  it("sums totalValue, unrealized, realized, and dailyChange correctly", () => {
    const txns: Transaction[] = [
      tx({ quantity: 1, price_per_unit: 30000, transacted_at: "2024-01-01" }),
    ];
    const holdings = deriveHoldings(txns, priceMap);
    const summary = portfolioSummary(holdings);
    expect(summary.totalValue).toBeCloseTo(40000);
    expect(summary.totalUnrealized).toBeCloseTo(10000);
    expect(summary.totalRealized).toBe(0);
    // dailyChange = 40000 * 0.02 = 800
    expect(summary.dailyChange).toBeCloseTo(800);
  });
});
