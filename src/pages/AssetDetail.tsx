import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, ArrowLeft, ExternalLink, Radio } from "lucide-react";
import {
  getCryptoOHLC,
  getCryptoInfo,
  getCryptoDetail,
  type OHLCPoint,
  type CryptoInfo,
} from "../lib/coingecko";
import { getBinanceKlines, openKlineStream, binanceSymbol } from "../lib/binance";
import { getStockQuote, getStockDailyOHLC } from "../lib/alphavantage";
import {
  getStockProfile,
  getStockOHLC,
  fmpConfigured,
  type StockProfile,
  type StockOHLCPoint,
} from "../lib/fmp";
import { useAsync } from "../hooks/useAsync";
import { useLiveTicker } from "../hooks/useLiveTicker";
import { useAuth } from "../context/AuthContext";
import { useWatchlist } from "../hooks/useWatchlist";
import { CandlestickChart } from "../components/charts/CandlestickChart";
import { PriceChart } from "../components/charts/PriceChart";
import {
  IntervalPicker,
  CRYPTO_INTERVALS,
  STOCK_INTERVALS,
  STOCK_STORAGE_KEY,
  DEFAULT_STOCK_PREFERRED,
  getIntervalByLabel,
  type Interval,
} from "../components/charts/IntervalPicker";
import { getStockKlines, tdConfigured } from "../lib/twelvedata";
import { ChangeBadge } from "../components/ui/ChangeBadge";
import { AssetIcon } from "../components/ui/AssetIcon";
import { ErrorState } from "../components/ui/States";
import {
  changeDirection,
  formatCompactUsd,
  formatNumber,
  formatPercent,
  formatPrice,
} from "../lib/format";
import type { Asset, AssetType, PricePoint } from "../types";


function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AssetDetail() {
  const { type, id } = useParams<{ type: AssetType; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isWatched, add, removeByAsset } = useWatchlist();

  const isCrypto = type === "crypto";
  const [cryptoInterval, setCryptoInterval] = useState<Interval>(
    () => getIntervalByLabel("1D", CRYPTO_INTERVALS), // default daily candles
  );
  const [stockInterval, setStockInterval] = useState<Interval>(
    () => getIntervalByLabel("1D", STOCK_INTERVALS),
  );
  const [liveCandle, setLiveCandle] = useState<OHLCPoint | null>(null);

  // ── Asset detail ──
  const detail = useAsync<{ asset: Asset; sample: boolean }>(async () => {
    if (!id) throw new Error("Missing asset id.");
    if (isCrypto) return { asset: await getCryptoDetail(id), sample: false };
    return getStockQuote(id);
  }, [type, id], { pollMs: isCrypto ? undefined : 60_000 });

  // Binance trading pair for this coin (null if not listed → CoinGecko fallback).
  const cryptoSymbol = isCrypto ? detail.data?.asset?.symbol : undefined;
  const onBinance = isCrypto && cryptoSymbol ? binanceSymbol(cryptoSymbol) !== null : false;

  // ── Crypto OHLC candlestick (Binance klines: real per-interval candles + full history) ──
  const ohlc = useAsync<OHLCPoint[]>(async () => {
    if (!isCrypto) return [];
    if (cryptoSymbol && binanceSymbol(cryptoSymbol)) {
      try {
        return await getBinanceKlines(cryptoSymbol, cryptoInterval.label);
      } catch {
        /* fall through to CoinGecko */
      }
    }
    // Fallback for coins not on Binance: CoinGecko, last 365 days only.
    if (!id) return [];
    return getCryptoOHLC(id, 365);
  }, [isCrypto, id, cryptoSymbol, cryptoInterval.label]);

  // ── Live candle stream (updates the in-progress bar without a refresh) ──
  useEffect(() => {
    setLiveCandle(null);
    if (!isCrypto || !cryptoSymbol || !binanceSymbol(cryptoSymbol)) return;
    return openKlineStream(cryptoSymbol, cryptoInterval.label, (candle) => setLiveCandle(candle));
  }, [isCrypto, cryptoSymbol, cryptoInterval.label]);

  // ── Live price / 24h stats (Binance ticker WebSocket) ──
  const liveTicker = useLiveTicker(cryptoSymbol, isCrypto);

  // ── Crypto info (description, supply, ATL, price changes) ──
  const cryptoInfo = useAsync<CryptoInfo>(async () => {
    if (!id || !isCrypto) return { description: "", categories: [] };
    return getCryptoInfo(id);
  }, [type, id]);

  // ── Stock OHLC: Twelve Data (multi-interval) → FMP daily fallback ──
  const stockOHLC = useAsync<StockOHLCPoint[]>(async () => {
    if (!id || isCrypto) return [];
    // Twelve Data: real multi-interval candles
    if (tdConfigured && stockInterval.tdInterval) {
      const td = await getStockKlines(id.toUpperCase(), stockInterval.tdInterval);
      if (td.length > 0) return td;
    }
    // Fallback: FMP daily (all history, used when TD key absent or request failed)
    if (fmpConfigured) return getStockOHLC(id, "max");
    return getStockDailyOHLC(id);
  }, [type, id, isCrypto, stockInterval.tdInterval]);

  // ── Stock company profile ──
  const stockProfile = useAsync<StockProfile>(async () => {
    if (!id || isCrypto) return { description: "" };
    return getStockProfile(id);
  }, [type, id]);

  if (detail.error) return <ErrorState message={detail.error} onRetry={detail.reload} />;

  const asset = detail.data?.asset;
  const watched = asset ? isWatched(asset.id) : false;

  const toggleWatch = async () => {
    if (!asset) return;
    if (!user) { navigate("/login", { state: { from: `/asset/${type}/${id}` } }); return; }
    if (watched) await removeByAsset(asset.id);
    else await add(asset);
  };

  // Prefer live Binance ticker values; fall back to the loaded snapshot.
  const displayPrice = liveTicker?.price ?? asset?.price ?? 0;
  const displayChange = liveTicker?.changePercent ?? asset?.change24h ?? 0;
  const isLive = isCrypto && liveTicker !== null;
  const trend = changeDirection(displayChange);

  const stockCandles: StockOHLCPoint[] = stockOHLC.data ?? [];

  // Stablecoins (USDT, USDC, etc.) have <5% price range — candlestick looks broken.
  const isStablecoin = useMemo(() => {
    if (!ohlc.data || ohlc.data.length === 0) return false;
    const prices = ohlc.data.flatMap((c) => [c.high, c.low]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = (min + max) / 2;
    return avg > 0 && (max - min) / avg < 0.05;
  }, [ohlc.data]);

  // For stablecoins convert OHLC closes to PricePoints (ms timestamps) for the area chart.
  const stablecoinPriceData = useMemo((): PricePoint[] => {
    if (!isStablecoin || !ohlc.data) return [];
    return ohlc.data.map((c) => ({ time: c.time * 1000, price: c.close }));
  }, [isStablecoin, ohlc.data]);

  return (
    <div className="animate-fade-in">
      <Link
        to={isCrypto ? "/markets/crypto" : "/markets/stocks"}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to markets
      </Link>

      {!asset ? (
        <div className="card p-8 text-ink-muted" role="status">Loading asset…</div>
      ) : (
        <>
          {/* ── Header ── */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <AssetIcon asset={asset} size={56} />
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">{asset.name}</h1>
                <p className="mt-0.5 text-sm uppercase tracking-wider text-ink-muted">
                  {asset.symbol} · {isCrypto ? "Crypto" : "Stock"}
                  {asset.rank ? ` · Rank #${asset.rank}` : ""}
                  {stockProfile.data?.exchange ? ` · ${stockProfile.data.exchange}` : ""}
                </p>
                {stockProfile.data?.sector && (
                  <p className="mt-1 text-xs text-ink-muted">
                    {stockProfile.data.sector}
                    {stockProfile.data.industry ? ` · ${stockProfile.data.industry}` : ""}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void toggleWatch()}
              aria-pressed={watched}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-5 py-2 font-semibold transition-colors ${
                watched ? "border-brand bg-brand/15 text-brand" : "border-line hover:border-brand hover:text-brand"
              }`}
            >
              <Star className={`h-4 w-4 ${watched ? "fill-brand" : ""}`} aria-hidden="true" />
              {watched ? "In Watchlist" : "Add to Watchlist"}
            </button>
          </div>

          {/* ── Price ── */}
          <div className="mb-6 flex flex-wrap items-end gap-3" aria-live="polite">
            <span className="text-4xl font-extrabold tabular-nums">{formatPrice(displayPrice)}</span>
            <span className="pb-1"><ChangeBadge value={displayChange} size="md" /></span>
            {isLive && (
              <span className="mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-up">
                <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" />
                Live
              </span>
            )}
          </div>

          {detail.data?.sample && (
            <p className="mb-4 rounded-lg border border-line bg-card px-3 py-2 text-xs text-ink-muted">
              Showing sample data. Add an Alpha Vantage API key for live quotes.
            </p>
          )}

          {/* ── Chart card ── */}
          <div className="card mb-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold">Price Chart</h2>

              {isCrypto ? (
                <IntervalPicker value={cryptoInterval.label} onChange={setCryptoInterval} />
              ) : (
                <IntervalPicker
                  value={stockInterval.label}
                  onChange={setStockInterval}
                  intervals={STOCK_INTERVALS}
                  storageKey={STOCK_STORAGE_KEY}
                  defaultPreferred={DEFAULT_STOCK_PREFERRED}
                />
              )}
            </div>

            <div className="p-4">
              {isCrypto ? (
                <>
                  {ohlc.loading || !ohlc.data ? (
                    <div className="h-[340px] w-full skeleton rounded-lg" aria-hidden="true" />
                  ) : ohlc.error ? (
                    <ErrorState message={ohlc.error} onRetry={ohlc.reload} />
                  ) : isStablecoin ? (
                    <PriceChart data={stablecoinPriceData} trend="flat" />
                  ) : ohlc.data.length > 0 ? (
                    <CandlestickChart
                      data={ohlc.data}
                      trend={trend}
                      liveCandle={onBinance ? liveCandle : null}
                      intraday={cryptoInterval.intraday}
                    />
                  ) : (
                    <div className="flex h-[340px] items-center justify-center text-sm text-ink-muted">
                      No chart data available.
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-ink-muted">
                    {isStablecoin
                      ? "Stablecoin — price is pegged to USD · Last 365 days"
                      : `${cryptoInterval.note} · ${onBinance ? "Live via Binance · scroll & pinch to zoom" : "Data: CoinGecko (last 365 days — not on Binance)"}`}
                  </p>
                </>
              ) : stockOHLC.loading ? (
                <div className="h-[340px] w-full skeleton rounded-lg" aria-hidden="true" />
              ) : stockCandles.length > 0 ? (
                <>
                  <CandlestickChart
                    data={stockCandles as OHLCPoint[]}
                    trend={trend}
                    intraday={stockInterval.intraday}
                  />
                  <p className="mt-2 text-[10px] text-ink-muted">
                    {stockInterval.note} · {tdConfigured ? "Live via Twelve Data" : "Data: FMP (daily)"} · scroll &amp; pinch to zoom
                  </p>
                </>
              ) : (
                <div className="flex h-[340px] items-center justify-center text-sm text-ink-muted">
                  No chart data available.
                </div>
              )}
            </div>
          </div>

          {/* ── Stats grid ── */}
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-ink-muted uppercase tracking-wide">Market Data</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {(liveTicker?.high24h ?? asset.high24h) !== undefined && (
                <Stat label="24h High" value={formatPrice(liveTicker?.high24h ?? asset.high24h!)} />
              )}
              {(liveTicker?.low24h ?? asset.low24h) !== undefined && (
                <Stat label="24h Low" value={formatPrice(liveTicker?.low24h ?? asset.low24h!)} />
              )}
              {(liveTicker?.volume24h ?? asset.volume24h) !== undefined && (
                <Stat label="24h Volume" value={formatCompactUsd(liveTicker?.volume24h ?? asset.volume24h!)} />
              )}
              {asset.marketCap !== undefined && <Stat label="Market Cap" value={formatCompactUsd(asset.marketCap)} />}
              {asset.ath !== undefined && <Stat label="All-Time High" value={formatPrice(asset.ath)} />}
              {cryptoInfo.data?.atl !== undefined && <Stat label="All-Time Low" value={formatPrice(cryptoInfo.data.atl)} />}
              {cryptoInfo.data?.circulatingSupply != null && (
                <Stat label="Circulating Supply" value={`${formatNumber(Math.round(cryptoInfo.data.circulatingSupply))} ${asset.symbol}`} />
              )}
              {cryptoInfo.data?.maxSupply != null ? (
                <Stat label="Max Supply" value={`${formatNumber(Math.round(cryptoInfo.data.maxSupply))} ${asset.symbol}`} />
              ) : cryptoInfo.data != null && cryptoInfo.data.circulatingSupply != null ? (
                <Stat label="Max Supply" value="No hard cap" />
              ) : null}
              {cryptoInfo.data?.totalSupply != null && cryptoInfo.data?.maxSupply == null && (
                <Stat label="Total Supply" value={`${formatNumber(Math.round(cryptoInfo.data.totalSupply))} ${asset.symbol}`} />
              )}
              {cryptoInfo.data?.athDate && (
                <Stat label="ATH Date" value={formatDate(cryptoInfo.data.athDate)} />
              )}
              {cryptoInfo.data?.genesisDate && (
                <Stat label="Genesis Date" value={formatDate(cryptoInfo.data.genesisDate)} />
              )}
              {/* Stock-specific stats from FMP */}
              {stockProfile.data?.pe !== undefined && (
                <Stat label="P/E Ratio" value={stockProfile.data.pe.toFixed(2)} />
              )}
              {stockProfile.data?.week52High !== undefined && (
                <Stat label="52-Week High" value={formatPrice(stockProfile.data.week52High)} />
              )}
              {stockProfile.data?.week52Low !== undefined && (
                <Stat label="52-Week Low" value={formatPrice(stockProfile.data.week52Low)} />
              )}
              {stockProfile.data?.beta !== undefined && (
                <Stat label="Beta" value={stockProfile.data.beta.toFixed(2)} />
              )}
              {stockProfile.data?.employees !== undefined && (
                <Stat label="Employees" value={formatNumber(stockProfile.data.employees)} />
              )}
              {stockProfile.data?.avgVolume !== undefined && (
                <Stat label="Avg Volume" value={formatCompactUsd(stockProfile.data.avgVolume)} />
              )}
            </dl>
          </div>

          {/* ── Price performance ── (crypto only) */}
          {isCrypto && (cryptoInfo.data?.change7d !== undefined || cryptoInfo.data?.change30d !== undefined) && (
            <div className="mb-6">
              <h2 className="mb-3 text-sm font-semibold text-ink-muted uppercase tracking-wide">Price Performance</h2>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {asset.change24h !== undefined && (
                  <PerformanceStat label="24h" value={asset.change24h} />
                )}
                {cryptoInfo.data?.change7d !== undefined && (
                  <PerformanceStat label="7 Days" value={cryptoInfo.data.change7d} />
                )}
                {cryptoInfo.data?.change30d !== undefined && (
                  <PerformanceStat label="30 Days" value={cryptoInfo.data.change30d} />
                )}
                {cryptoInfo.data?.change1y !== undefined && (
                  <PerformanceStat label="1 Year" value={cryptoInfo.data.change1y} />
                )}
              </dl>
            </div>
          )}

          {/* ── About section ── */}
          {isCrypto && (
            <AboutCrypto info={cryptoInfo.data ?? undefined} loading={cryptoInfo.loading} asset={asset} />
          )}
          {!isCrypto && (
            <AboutStock profile={stockProfile.data ?? undefined} loading={stockProfile.loading} asset={asset} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function PerformanceStat({ label, value }: { label: string; value: number }) {
  const dir = changeDirection(value);
  const color = dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-ink-muted";
  return (
    <div className="card p-4">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`mt-1 font-semibold tabular-nums ${color}`}>{formatPercent(value)}</dd>
    </div>
  );
}

function AboutCrypto({
  info,
  loading,
  asset,
}: {
  info: CryptoInfo | undefined;
  loading: boolean;
  asset: Asset;
}) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <section aria-labelledby="about-heading" className="card p-6">
        <h2 id="about-heading" className="mb-4 text-lg font-bold">About {asset.name}</h2>
        <div className="space-y-2">
          <div className="skeleton h-4 rounded" />
          <div className="skeleton h-4 w-4/5 rounded" />
          <div className="skeleton h-4 w-3/5 rounded" />
        </div>
      </section>
    );
  }

  if (!info?.description) return null;

  const SHORT = 500;
  const isLong = info.description.length > SHORT;
  const shown = isLong && !expanded ? info.description.slice(0, SHORT) + "…" : info.description;

  return (
    <section aria-labelledby="about-heading" className="card p-6">
      <h2 id="about-heading" className="mb-4 text-lg font-bold">About {asset.name}</h2>

      {info.categories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {info.categories.map((c) => (
            <span key={c} className="rounded-full border border-line bg-elevated px-3 py-0.5 text-xs text-ink-muted">
              {c}
            </span>
          ))}
        </div>
      )}

      <p className="text-sm leading-relaxed text-ink-muted">{shown}</p>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 block text-xs font-semibold text-brand hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}

      {info.homepage && (
        <a
          href={info.homepage}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          Official website <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      )}
    </section>
  );
}

function AboutStock({
  profile,
  loading,
  asset,
}: {
  profile: StockProfile | undefined;
  loading: boolean;
  asset: Asset;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!fmpConfigured) {
    return (
      <section className="card p-6">
        <h2 className="mb-2 text-lg font-bold">About {asset.name}</h2>
        <p className="text-sm text-ink-muted">
          Add a free{" "}
          <a
            href="https://financialmodelingprep.com/register"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand hover:underline"
          >
            FMP API key
          </a>{" "}
          to see company description, sector, financials, and more.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-bold">About {asset.name}</h2>
        <div className="space-y-2">
          <div className="skeleton h-4 rounded" />
          <div className="skeleton h-4 w-4/5 rounded" />
        </div>
      </section>
    );
  }

  if (!profile?.description) return null;

  const SHORT = 500;
  const isLong = profile.description.length > SHORT;
  const shown = isLong && !expanded ? profile.description.slice(0, SHORT) + "…" : profile.description;

  return (
    <section className="card p-6">
      <h2 className="mb-4 text-lg font-bold">About {asset.name}</h2>

      <div className="mb-4 flex flex-wrap gap-2">
        {profile.sector && (
          <span className="rounded-full border border-line bg-elevated px-3 py-0.5 text-xs text-ink-muted">
            {profile.sector}
          </span>
        )}
        {profile.industry && (
          <span className="rounded-full border border-line bg-elevated px-3 py-0.5 text-xs text-ink-muted">
            {profile.industry}
          </span>
        )}
        {profile.country && (
          <span className="rounded-full border border-line bg-elevated px-3 py-0.5 text-xs text-ink-muted">
            {profile.country}
          </span>
        )}
      </div>

      <p className="text-sm leading-relaxed text-ink-muted">{shown}</p>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 block text-xs font-semibold text-brand hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-muted">
        {profile.ceo && <span>CEO: <strong className="text-ink">{profile.ceo}</strong></span>}
        {profile.ipoDate && <span>IPO: <strong className="text-ink">{formatDate(profile.ipoDate)}</strong></span>}
      </div>

      {profile.website && (
        <a
          href={profile.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          Official website <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      )}
    </section>
  );
}
