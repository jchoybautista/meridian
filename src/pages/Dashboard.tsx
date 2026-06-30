import { useState } from "react";
import { computeDominance, cryptoDegraded, getCryptoMarkets, getGlobalStats } from "../lib/coingecko";
import { getStockList } from "../lib/alphavantage";
import { useAsync } from "../hooks/useAsync";
import { SearchBar } from "../components/ui/SearchBar";
import { ChangeBadge } from "../components/ui/ChangeBadge";
import { ErrorState } from "../components/ui/States";
import { formatCompactUsd } from "../lib/format";
import { Panel } from "../components/dashboard/Panel";
import { HeroPromo } from "../components/dashboard/HeroPromo";
import { PricesPanel } from "../components/dashboard/PricesPanel";
import { TopMovers } from "../components/dashboard/TopMovers";
import { LatestTransactions } from "../components/dashboard/LatestTransactions";
import { LatestBlocks } from "../components/dashboard/LatestBlocks";
import { FeaturedCoin } from "../components/dashboard/FeaturedCoin";
import { FearGreedGauge } from "../components/dashboard/FearGreedGauge";
import { TrendingCoins } from "../components/dashboard/TrendingCoins";
import { SectorPerformance } from "../components/dashboard/SectorPerformance";
import { ExploreAssets } from "../components/dashboard/ExploreAssets";
import { Heatmap } from "../components/charts/Heatmap";
import { DominancePie } from "../components/charts/DominancePie";
import { LiveDot } from "../components/ui/LiveDot";
import { useLiveAssets } from "../hooks/useLiveAssets";
import { useLiveStocks } from "../hooks/useLiveStocks";
import type { Asset } from "../types";

type Tab = "crypto" | "stocks";

// Fixed bento row height on desktop keeps every card uniform and contained.
const ROW = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:h-[336px]";

export function Dashboard() {
  const [tab, setTab] = useState<Tab>("crypto");

  const markets = useAsync(() => getCryptoMarkets(50, 1, true), []);
  const global = useAsync(() => getGlobalStats(), []);
  const stocks = useAsync(() => getStockList(), [], { pollMs: 60_000 });

  return (
    <div className="animate-fade-in">
      {/* Tabs + search */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <MarketTabs tab={tab} onChange={setTab} />
        <div className="lg:max-w-md lg:flex-1">
          <SearchBar />
        </div>
      </div>

      {tab === "crypto" ? (
        <CryptoBoard markets={markets} global={global} />
      ) : (
        <StocksBoard stocks={stocks} />
      )}
    </div>
  );
}

function MarketTabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Market type"
      className="glass-chrome inline-flex rounded-lg border border-line p-1"
    >
      {(["crypto", "stocks"] as const).map((t) => (
        <button
          key={t}
          role="tab"
          aria-selected={tab === t}
          onClick={() => onChange(t)}
          className={`rounded-md px-5 py-1.5 text-sm font-semibold capitalize transition-colors ${
            tab === t ? "bg-brand text-white" : "text-ink-muted hover:text-ink"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

type MarketsState = ReturnType<typeof useAsync<Asset[]>>;
type GlobalState = ReturnType<typeof useAsync<Awaited<ReturnType<typeof getGlobalStats>>>>;
type StocksState = ReturnType<typeof useAsync<Awaited<ReturnType<typeof getStockList>>>>;

function CryptoBoard({ markets, global }: { markets: MarketsState; global: GlobalState }) {
  const snapshot = markets.data ?? [];
  const { assets, isLive } = useLiveAssets(snapshot);
  const btc = assets.find((a) => a.id === "bitcoin");
  const eth = assets.find((a) => a.id === "ethereum");
  const dominance = global.data?.dominance ?? computeDominance(assets);
  const totalMarketCap = global.data?.totalMarketCap;
  const marketCapChange24h = global.data?.marketCapChange24h;

  return (
    <>
      {(global.data || isLive) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {global.data ? (
            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {totalMarketCap !== undefined && (
                <div>
                  <dt className="text-xs text-ink-muted">Total Market Cap</dt>
                  <dd className="font-bold tabular-nums">{formatCompactUsd(totalMarketCap)}</dd>
                </div>
              )}
              {marketCapChange24h !== undefined && (
                <div>
                  <dt className="text-xs text-ink-muted">24h</dt>
                  <dd className="font-bold"><ChangeBadge value={marketCapChange24h} /></dd>
                </div>
              )}
            </dl>
          ) : (
            <span />
          )}
          {isLive && <LiveDot />}
        </div>
      )}

      {markets.error && (
        <div className="mb-6"><ErrorState message={markets.error} onRetry={markets.reload} /></div>
      )}
      {!markets.loading && cryptoDegraded && (
        <p className="mb-4 rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-muted">
          Live data temporarily unavailable (rate limited) — showing recent/sample data.
        </p>
      )}

      <div className={`mb-4 ${ROW}`}>
        <HeroPromo />
        {markets.loading ? <PanelSkeleton title="Prices" /> : <PricesPanel assets={assets} viewAllTo="/markets/crypto" />}
        <Panel title="Heatmap" subtitle="Crypto Market Cap" to="/markets/crypto">
          {markets.loading ? (
            <div className="skeleton h-full min-h-[200px] rounded-lg" aria-hidden="true" />
          ) : (
            <Heatmap assets={assets} />
          )}
        </Panel>
        <LatestTransactions />
      </div>

      <div className={`mb-4 ${ROW}`}>
        <Panel title="Charts" subtitle="Market Dominance">
          {dominance.length > 0 ? (
            <DominancePie data={dominance} />
          ) : (
            <div className="skeleton h-full min-h-[180px] rounded-lg" aria-hidden="true" />
          )}
        </Panel>
        {eth ? <FeaturedCoin asset={eth} /> : <PanelSkeleton title="Ethereum" />}
        {btc ? <FeaturedCoin asset={btc} /> : <PanelSkeleton title="Bitcoin" />}
        <LatestBlocks />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <FearGreedGauge />
        <div className="lg:col-span-3">
          <TrendingCoins />
        </div>
      </div>

      {assets.length > 0 && (
        <ExploreAssets assets={assets.slice(0, 30)} title="Explore top crypto assets" />
      )}
    </>
  );
}

function StocksBoard({ stocks }: { stocks: StocksState }) {
  const snapshot = stocks.data?.assets ?? [];
  const { assets, isLive: stocksLive } = useLiveStocks(snapshot);
  const featured = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"]
    .map((sym) => assets.find((a) => a.symbol === sym))
    .filter((a): a is Asset => Boolean(a));

  return (
    <>
      {stocksLive && (
        <div className="mb-4 flex justify-end">
          <LiveDot />
        </div>
      )}
      {stocks.error && (
        <div className="mb-6"><ErrorState message={stocks.error} onRetry={stocks.reload} /></div>
      )}
      {stocks.data?.sample && (
        <p className="mb-4 rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-muted">
          Prices shown are sample data.{" "}
          <a
            href="https://finnhub.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand underline hover:opacity-80"
          >
            Get a free Finnhub key
          </a>{" "}
          (60 calls/min, no card) and add it as <code className="text-ink">VITE_FINNHUB_KEY</code> in your <code className="text-ink">.env</code> to see live stock prices.
        </p>
      )}

      <div className={`mb-4 ${ROW}`}>
        <HeroPromo />
        {stocks.loading ? <PanelSkeleton title="Prices" /> : <PricesPanel assets={assets} viewAllTo="/markets/stocks" />}
        {stocks.loading ? <PanelSkeleton title="Top Movers" /> : <TopMovers assets={assets} />}
        {featured[0] ? <FeaturedCoin asset={featured[0]} /> : <PanelSkeleton title="Featured" />}
      </div>

      <div className={`mb-8 ${ROW}`}>
        <SectorPerformance />
        {featured.slice(1, 4).map((a) => (
          <FeaturedCoin key={a.id} asset={a} />
        ))}
        {featured.length < 4 &&
          Array.from({ length: 4 - Math.max(featured.length, 1) }).map((_, i) => (
            <PanelSkeleton key={i} title="Featured" />
          ))}
      </div>

      {assets.length > 0 && (
        <ExploreAssets assets={assets.slice(0, 30)} title="Explore top stocks" />
      )}
    </>
  );
}

function PanelSkeleton({ title }: { title: string }) {
  return (
    <Panel title={title}>
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-8 rounded" />
        ))}
      </div>
    </Panel>
  );
}
