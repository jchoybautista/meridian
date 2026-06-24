import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useWatchlist } from "../hooks/useWatchlist";
import { getCryptoByIds } from "../lib/coingecko";
import { getStockQuote } from "../lib/alphavantage";
import { PageHeader } from "../components/ui/PageHeader";
import { ChangeBadge } from "../components/ui/ChangeBadge";
import { AssetIcon } from "../components/ui/AssetIcon";
import { EmptyState, ErrorState } from "../components/ui/States";
import { formatPrice } from "../lib/format";
import type { Asset, WatchlistItem } from "../types";

interface Enriched extends WatchlistItem {
  price?: number;
  change24h?: number;
  image?: string;
}

export function Watchlist() {
  const { items, loading, error, remove, reload } = useWatchlist();
  const [enriched, setEnriched] = useState<Enriched[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      setEnriched([]);
      return;
    }
    let cancelled = false;
    setPricesLoading(true);

    async function enrich() {
      const cryptoIds = items
        .filter((i) => i.asset_type === "crypto" && i.asset_id)
        .map((i) => i.asset_id!) as string[];

      const cryptoMap = new Map<string, Asset>();
      if (cryptoIds.length) {
        try {
          const assets = await getCryptoByIds(cryptoIds);
          assets.forEach((a) => cryptoMap.set(a.id, a));
        } catch {
          /* leave prices undefined on failure */
        }
      }

      const stockMap = new Map<string, Asset>();
      const stockItems = items.filter((i) => i.asset_type === "stock");
      await Promise.all(
        stockItems.map(async (i) => {
          try {
            const { asset } = await getStockQuote(i.asset_symbol);
            stockMap.set(i.asset_symbol, asset);
          } catch {
            /* ignore */
          }
        }),
      );

      if (cancelled) return;
      setEnriched(
        items.map((i) => {
          const a =
            i.asset_type === "crypto" && i.asset_id
              ? cryptoMap.get(i.asset_id)
              : stockMap.get(i.asset_symbol);
          return { ...i, price: a?.price, change24h: a?.change24h, image: a?.image };
        }),
      );
      setPricesLoading(false);
    }

    void enrich();
    return () => {
      cancelled = true;
    };
  }, [items]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Watchlist" subtitle="Assets you’re keeping an eye on." />

      {error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="Your watchlist is empty"
          message="Browse the markets and tap “Add to Watchlist” on any asset to track it here."
          action={
            <Link
              to="/markets/crypto"
              className="rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-hover"
            >
              Browse markets
            </Link>
          }
        />
      )}

      {items.length > 0 && (
        <div className="card divide-y divide-line">
          {enriched.map((i) => (
            <div key={i.id} className="flex items-center gap-3 p-4">
              <AssetIcon
                asset={{
                  symbol: i.asset_symbol,
                  name: i.asset_name,
                  image: i.image,
                  type: i.asset_type,
                }}
                size={36}
              />
              <Link
                to={`/asset/${i.asset_type}/${i.asset_id ?? i.asset_symbol}`}
                className="min-w-0 flex-1 hover:text-brand"
              >
                <p className="truncate font-medium">{i.asset_name}</p>
                <p className="text-xs uppercase text-ink-muted">{i.asset_symbol}</p>
              </Link>
              <div className="text-right">
                <p className="font-semibold tabular-nums">
                  {pricesLoading && i.price === undefined ? "…" : formatPrice(i.price)}
                </p>
                {i.change24h !== undefined && <ChangeBadge value={i.change24h} />}
              </div>
              <button
                type="button"
                onClick={() => void remove(i.id)}
                className="ml-2 rounded-lg p-2 text-ink-muted hover:bg-elevated hover:text-down"
                aria-label={`Remove ${i.asset_name} from watchlist`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
