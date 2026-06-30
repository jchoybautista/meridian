import { getBinanceTickers } from "../../lib/binance";
import { useAsync } from "../../hooks/useAsync";
import { formatCompactUsd, formatPrice } from "../../lib/format";

function Arrow({ positive }: { positive: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className={positive ? "text-up" : "text-down"}
      fill="currentColor"
    >
      {positive ? (
        <path d="M5 1 L9 8 H1 Z" />
      ) : (
        <path d="M5 9 L9 2 H1 Z" />
      )}
    </svg>
  );
}

export function BinanceMarketStats({ className = "" }: { className?: string }) {
  const { data, loading } = useAsync(getBinanceTickers, []);

  return (
    <section className={`card flex flex-col overflow-hidden p-5 ${className}`}>
      <header className="mb-3 shrink-0">
        <h2 className="font-bold leading-tight">Binance Markets</h2>
        <p className="text-xs text-ink-muted">24h top pairs · live</p>
      </header>

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton h-7 rounded" />
          ))}
        </div>
      ) : !data?.length ? (
        <p className="text-sm text-ink-muted">Data unavailable</p>
      ) : (
        <ol className="flex min-h-0 flex-1 flex-col justify-between">
          {data.map((t) => {
            const pos = t.changePercent >= 0;
            return (
              <li key={t.symbol} className="flex items-center gap-2 border-b border-line/40 py-1 text-xs last:border-0">
                <span className="w-12 font-semibold tabular-nums">{t.base}</span>
                <span className="flex-1 tabular-nums text-ink-muted">{formatPrice(t.price)}</span>
                <span className={`flex items-center gap-0.5 font-medium tabular-nums ${pos ? "text-up" : "text-down"}`}>
                  <Arrow positive={pos} />
                  {pos ? "+" : ""}{t.changePercent.toFixed(2)}%
                </span>
                <span className="w-14 text-right tabular-nums text-ink-muted">
                  {formatCompactUsd(t.volume24h)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
