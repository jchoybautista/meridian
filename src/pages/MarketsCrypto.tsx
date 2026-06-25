import { getCryptoMarkets } from "../lib/coingecko";
import { useAsync } from "../hooks/useAsync";
import { useLiveAssets } from "../hooks/useLiveAssets";
import { PageHeader } from "../components/ui/PageHeader";
import { LiveDot } from "../components/ui/LiveDot";
import { MarketTable } from "../components/markets/MarketTable";
import { ErrorState, LoadingAnnounce } from "../components/ui/States";

export function MarketsCrypto() {
  const { data, loading, error, reload } = useAsync(() => getCryptoMarkets(100), []);
  const { assets, isLive } = useLiveAssets(data ?? []);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title="Crypto Markets" subtitle="Top 100 cryptocurrencies by market cap." />
        {isLive && <LiveDot />}
      </div>

      {loading && (
        <>
          <LoadingAnnounce label="Loading crypto markets" />
          <div className="card p-6 text-ink-muted">Loading markets…</div>
        </>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && <MarketTable assets={assets} variant="crypto" />}
    </div>
  );
}
