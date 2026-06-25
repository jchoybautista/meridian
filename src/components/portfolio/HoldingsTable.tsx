import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { HoldingWithPnL } from "../../types";
import { ChangeBadge } from "../ui/ChangeBadge";
import { AssetIcon } from "../ui/AssetIcon";
import { formatCompactUsd, formatPercent, formatPrice, changeDirection } from "../../lib/format";

interface Props {
  holdings: HoldingWithPnL[];
  loading: boolean;
  onNavigate: (holding: HoldingWithPnL) => void;
}

type SortKey = "marketValue" | "unrealizedPnL" | "change24h";

function SkeletonRow() {
  return (
    <tr className="border-b border-line/50">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="skeleton h-7 w-7 rounded-full" />
          <div className="space-y-1">
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton h-2 w-24 rounded" />
          </div>
        </div>
      </td>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-3 w-16 rounded ml-auto" />
        </td>
      ))}
    </tr>
  );
}

export function HoldingsTable({ holdings, loading, onNavigate }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("marketValue");
  const [sortAsc, setSortAsc] = useState(false);

  const totalValue = holdings.reduce((s, h) => s + h.marketValue, 0);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...holdings].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortAsc ? diff : -diff;
  });

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return (
      <span className="ml-1 text-ink-muted">{sortAsc ? "↑" : "↓"}</span>
    );
  }

  return (
    <div className="card overflow-hidden">
      <h2 className="px-5 py-4 text-sm font-semibold border-b border-line">Holdings</h2>

      {loading ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-ink-muted">
                <th className="px-5 py-3 text-left font-medium">Asset</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Avg Cost</th>
                <th className="px-4 py-3 text-right font-medium">Current</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
                <th className="px-4 py-3 text-right font-medium">Unrealized P&amp;L</th>
                <th className="px-4 py-3 text-right font-medium">24h Change</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      ) : holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-ink-muted text-sm">No holdings yet.</p>
          <p className="text-ink-muted text-xs mt-1">Add transactions to track your portfolio.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-ink-muted">
                <th className="px-5 py-3 text-left font-medium">Asset</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Avg Cost</th>
                <th className="px-4 py-3 text-right font-medium">Current</th>
                <th
                  className="px-4 py-3 text-right font-medium cursor-pointer hover:text-ink select-none"
                  onClick={() => handleSort("marketValue")}
                >
                  Value
                  <SortIndicator col="marketValue" />
                </th>
                <th
                  className="px-4 py-3 text-right font-medium cursor-pointer hover:text-ink select-none"
                  onClick={() => handleSort("unrealizedPnL")}
                >
                  Unrealized P&amp;L
                  <SortIndicator col="unrealizedPnL" />
                </th>
                <th
                  className="px-4 py-3 text-right font-medium cursor-pointer hover:text-ink select-none"
                  onClick={() => handleSort("change24h")}
                >
                  24h Change
                  <SortIndicator col="change24h" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => {
                const isOpen = expanded === h.asset_id;
                const dir = changeDirection(h.unrealizedPnL);
                const pct = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
                const assetForIcon = {
                  symbol: h.asset_symbol,
                  name: h.asset_name,
                  type: h.asset_type,
                  image: undefined,
                };

                return (
                  <React.Fragment key={h.asset_id}>
                    <tr
                      className="border-b border-line/50 hover:bg-elevated/40 cursor-pointer transition-colors"
                      onClick={() => {
                        setExpanded(isOpen ? null : h.asset_id);
                        onNavigate(h);
                      }}
                      aria-expanded={isOpen}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <AssetIcon asset={assetForIcon} size={28} />
                          <div>
                            <p className="font-semibold">{h.asset_symbol}</p>
                            <p className="text-xs text-ink-muted truncate max-w-[120px]">
                              {h.asset_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {h.quantity.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatPrice(h.avgCost)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatPrice(h.currentPrice)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <div>
                          <p>{formatCompactUsd(h.marketValue)}</p>
                          <p className="text-xs text-ink-muted">{pct.toFixed(1)}%</p>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 text-right tabular-nums ${dir === "up" ? "text-up" : dir === "down" ? "text-down" : ""}`}
                      >
                        <p>
                          {h.unrealizedPnL >= 0 ? "+" : ""}
                          {formatCompactUsd(h.unrealizedPnL)}
                        </p>
                        <p className="text-xs">{formatPercent(h.unrealizedPct)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <ChangeBadge value={h.change24h} withIcon={false} />
                          <ChevronDown
                            className={`h-3 w-3 text-ink-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                            aria-hidden="true"
                          />
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${h.asset_id}-expand`} className="bg-elevated/20">
                        <td colSpan={7} className="px-5 py-3">
                          <p className="mb-2 text-xs font-semibold text-ink-muted uppercase tracking-wide">
                            Transactions
                          </p>
                          {h.transactions.length === 0 ? (
                            <p className="text-xs text-ink-muted">No transactions recorded.</p>
                          ) : (
                            <div className="space-y-1">
                              {[...h.transactions]
                                .sort((a, b) =>
                                  b.transacted_at.localeCompare(a.transacted_at),
                                )
                                .map((t) => (
                                  <div key={t.id} className="flex items-center gap-3 text-xs">
                                    <span
                                      className={`rounded px-2 py-0.5 font-bold ${t.type === "buy" ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}
                                    >
                                      {t.type.toUpperCase()}
                                    </span>
                                    <span className="tabular-nums">
                                      {t.quantity} @ {formatPrice(t.price_per_unit)}
                                    </span>
                                    <span className="text-ink-muted">{t.transacted_at}</span>
                                    {t.notes && (
                                      <span className="text-ink-muted italic">{t.notes}</span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
