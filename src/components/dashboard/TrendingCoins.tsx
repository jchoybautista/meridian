import { useNavigate } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { getTrendingCoins } from "../../lib/coingecko";
import { ChangeBadge } from "../ui/ChangeBadge";
import { Panel } from "./Panel";

/** Trending Coins widget — top 7 from CoinGecko /search/trending, cached 10 min. */
export function TrendingCoins({ className }: { className?: string }) {
  const { data, loading } = useAsync(getTrendingCoins, []);
  const navigate = useNavigate();

  return (
    <Panel title="🔥 Trending" subtitle="Top coins right now" className={className}>
      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton h-8 rounded" />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-auto">
          {(data ?? []).map((coin, i) => (
            <li key={coin.id}>
              <button
                type="button"
                onClick={() => navigate(`/asset/crypto/${coin.id}`)}
                className="flex w-full items-center gap-2 py-2 text-left transition-colors hover:text-brand"
              >
                <span className="w-4 shrink-0 text-[10px] text-ink-muted">{i + 1}</span>
                <img
                  src={coin.thumb}
                  alt=""
                  width={30}
                  height={30}
                  className="shrink-0 rounded-full bg-elevated object-cover"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{coin.name}</span>
                  <span className="text-[10px] text-ink-muted">{coin.symbol}</span>
                </span>
                {coin.change24h !== undefined && (
                  <ChangeBadge value={coin.change24h} size="sm" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
