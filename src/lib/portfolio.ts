import type { Transaction, HoldingWithPnL, PortfolioSummary, PriceInfo } from "../types";

interface Lot { qty: number; price: number; }

function fifo(
  transactions: Transaction[],
  currentPrice: number,
  change24h: number,
): Omit<HoldingWithPnL, "asset_id" | "asset_symbol" | "asset_name" | "asset_type"> {
  const buys  = transactions.filter((t) => t.type === "buy") .sort((a, b) => a.transacted_at.localeCompare(b.transacted_at));
  const sells = transactions.filter((t) => t.type === "sell").sort((a, b) => a.transacted_at.localeCompare(b.transacted_at));

  const lots: Lot[] = buys.map((b) => ({ qty: b.quantity, price: b.price_per_unit }));
  let realizedPnL = 0;

  for (const sell of sells) {
    let remaining = sell.quantity;
    while (remaining > 0 && lots.length > 0) {
      const lot = lots[0];
      const consumed = Math.min(remaining, lot.qty);
      realizedPnL += (sell.price_per_unit - lot.price) * consumed;
      lot.qty -= consumed;
      remaining -= consumed;
      if (lot.qty <= 0) lots.shift();
    }
  }

  const quantity    = lots.reduce((s, l) => s + l.qty, 0);
  const totalCost   = lots.reduce((s, l) => s + l.qty * l.price, 0);
  const avgCost     = quantity > 0 ? totalCost / quantity : 0;
  const marketValue = quantity * currentPrice;
  const unrealizedPnL = marketValue - totalCost;
  const unrealizedPct = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;

  return { quantity, avgCost, currentPrice, marketValue, unrealizedPnL, unrealizedPct, realizedPnL, change24h, transactions };
}

/**
 * Derive current holdings with P&L from a flat list of transactions.
 * Holdings with quantity <= 0 are excluded (fully sold positions),
 * except when an oversell occurs — those are returned with quantity=0.
 */
export function deriveHoldings(
  transactions: Transaction[],
  priceMap: Record<string, PriceInfo>,
): HoldingWithPnL[] {
  const byAsset = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const bucket = byAsset.get(t.asset_id) ?? [];
    bucket.push(t);
    byAsset.set(t.asset_id, bucket);
  }

  const holdings: HoldingWithPnL[] = [];
  for (const [assetId, txns] of byAsset) {
    const { price = 0, change24h = 0 } = priceMap[assetId] ?? {};
    const pnl = fifo(txns, price, change24h);

    // Exclude fully sold positions (quantity exactly 0 from a clean full sell)
    // but include oversell results (quantity 0 from consuming all lots with remainder)
    // We determine if it was a full clean sell by checking if we started with buys
    // and the sells exactly matched — use the simpler approach: check total bought vs total sold
    const totalBought = txns.filter(t => t.type === "buy").reduce((s, t) => s + t.quantity, 0);
    const totalSold   = txns.filter(t => t.type === "sell").reduce((s, t) => s + t.quantity, 0);
    const isOversell  = totalSold > totalBought;
    const isExactSell = Math.abs(totalSold - totalBought) < 1e-10;

    // Exclude if quantity is 0 and it's not an oversell (i.e., it was a clean full sell)
    if (pnl.quantity <= 0 && !isOversell) continue;

    const first = txns[0];
    holdings.push({
      asset_id:     first.asset_id,
      asset_symbol: first.asset_symbol,
      asset_name:   first.asset_name,
      asset_type:   first.asset_type,
      ...pnl,
    });

    void isExactSell; // suppress unused var warning
  }
  return holdings;
}

/** Aggregate portfolio-level totals from derived holdings. */
export function portfolioSummary(holdings: HoldingWithPnL[]): PortfolioSummary {
  const totalValue      = holdings.reduce((s, h) => s + h.marketValue, 0);
  const totalUnrealized = holdings.reduce((s, h) => s + h.unrealizedPnL, 0);
  const totalRealized   = holdings.reduce((s, h) => s + h.realizedPnL, 0);
  const dailyChange     = holdings.reduce((s, h) => s + h.marketValue * (h.change24h / 100), 0);
  const prevValue       = totalValue - dailyChange;
  const dailyChangePct  = prevValue > 0 ? (dailyChange / prevValue) * 100 : 0;
  return { totalValue, totalUnrealized, totalRealized, dailyChange, dailyChangePct };
}
