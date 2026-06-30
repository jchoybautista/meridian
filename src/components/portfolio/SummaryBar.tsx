import { Radio } from "lucide-react";
import type { PortfolioSummary } from "../../types";
import { formatCompactUsd, formatPercent, formatPrice, changeDirection } from "../../lib/format";

interface Props {
  summary: PortfolioSummary | null;
  loading: boolean;
  isLive?: boolean;
}

function StatPill({
  label,
  value,
  pct,
  highlight,
}: {
  label: string;
  value: number;
  pct?: number;
  highlight?: boolean;
}) {
  const dir = changeDirection(value);
  const color = highlight
    ? dir === "up"
      ? "text-up"
      : dir === "down"
        ? "text-down"
        : "text-ink"
    : "text-ink";
  return (
    <div className="card flex-1 min-w-[140px] p-5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`mt-1 text-lg font-extrabold tabular-nums ${color}`}>
        {value >= 0 ? "+" : ""}
        {formatCompactUsd(value)}
      </p>
      {pct !== undefined && (
        <p
          className={`text-xs font-semibold tabular-nums ${dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-ink-muted"}`}
        >
          {formatPercent(pct)}
        </p>
      )}
    </div>
  );
}

function SkeletonPill() {
  return (
    <div className="card flex-1 min-w-[140px] p-5 space-y-2">
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton h-6 w-28 rounded" />
    </div>
  );
}

export function SummaryBar({ summary, loading, isLive = false }: Props) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Portfolio</h1>
        {isLive && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-up">
            <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" /> Live
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {loading || !summary ? (
          <>
            <SkeletonPill />
            <SkeletonPill />
            <SkeletonPill />
            <SkeletonPill />
          </>
        ) : (
          <>
            <div className="card flex-1 min-w-[140px] p-5">
              <p className="text-xs text-ink-muted">Total Value</p>
              <p className="mt-1 text-lg font-extrabold tabular-nums">
                {formatPrice(summary.totalValue)}
              </p>
            </div>
            <StatPill label="Unrealized P&L" value={summary.totalUnrealized} highlight />
            <StatPill label="Realized P&L" value={summary.totalRealized} highlight />
            <StatPill
              label="24h Change"
              value={summary.dailyChange}
              pct={summary.dailyChangePct}
              highlight
            />
          </>
        )}
      </div>
    </div>
  );
}
