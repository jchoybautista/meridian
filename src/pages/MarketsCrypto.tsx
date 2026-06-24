import { getCryptoMarkets } from "../lib/coingecko";
import { useAsync } from "../hooks/useAsync";
import { PageHeader } from "../components/ui/PageHeader";
import { MarketTable } from "../components/markets/MarketTable";
import { ErrorState, LoadingAnnounce } from "../components/ui/States";

export function MarketsCrypto() {
  const { data, loading, error, reload } = useAsync(() => getCryptoMarkets(100), []);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Crypto Markets" subtitle="Top 100 cryptocurrencies by market cap." />

      {loading && (
        <>
          <LoadingAnnounce label="Loading crypto markets" />
          <div className="card p-6 text-ink-muted">Loading markets…</div>
        </>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && <MarketTable assets={data} variant="crypto" />}
    </div>
  );
}
