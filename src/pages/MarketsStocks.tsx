import { getStockList } from "../lib/alphavantage";
import { useAsync } from "../hooks/useAsync";
import { PageHeader } from "../components/ui/PageHeader";
import { MarketTable } from "../components/markets/MarketTable";
import { ErrorState, LoadingAnnounce } from "../components/ui/States";

export function MarketsStocks() {
  const { data, loading, error, reload } = useAsync(() => getStockList(), [], { pollMs: 60_000 });

  return (
    <div className="animate-fade-in">
      <PageHeader title="Stock Markets" subtitle="Popular publicly traded companies." />

      {loading && (
        <>
          <LoadingAnnounce label="Loading stocks" />
          <div className="card p-6 text-ink-muted">Loading stocks…</div>
        </>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <MarketTable assets={data.assets} variant="stock" />
          {data.sample && (
            <p className="mt-4 text-xs text-ink-muted">
              Prices shown are sample data so the demo always works. Add a free Alpha
              Vantage API key (<code>VITE_ALPHA_VANTAGE_KEY</code>) to fetch live quotes
              on individual stock pages.
            </p>
          )}
        </>
      )}
    </div>
  );
}
