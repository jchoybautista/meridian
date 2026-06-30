import { ExternalLink } from 'lucide-react';
import { SettingsBackHeader } from '../../components/settings/SettingsBackHeader';

const DATA_SOURCES = [
  { name: 'CoinGecko',     url: 'https://coingecko.com',     desc: 'Crypto prices and market data' },
  { name: 'Binance',       url: 'https://binance.com',       desc: 'Live crypto price streams' },
  { name: 'Finnhub',       url: 'https://finnhub.io',        desc: 'Stock quotes, financials, and news' },
  { name: 'Alpha Vantage', url: 'https://alphavantage.co',   desc: 'Stock market data' },
  { name: 'Twelve Data',   url: 'https://twelvedata.com',    desc: 'Intraday stock candles' },
  { name: 'mempool.space', url: 'https://mempool.space',     desc: 'Bitcoin mempool and block data' },
];

export function SettingsAbout() {
  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      <SettingsBackHeader title="About Meridian" />

      <div className="card p-5 mb-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand">
            <span className="text-lg font-extrabold text-white">M</span>
          </div>
          <div>
            <p className="text-lg font-extrabold">Meridian</p>
            <p className="text-xs text-ink-muted">Version 1.0.0</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-ink-muted">
          Track every market in one place. Real-time crypto prices, market heatmaps, portfolio
          tracking, and paper trading — free and open. Meridian is built for investors and
          enthusiasts who want a unified view of global financial markets.
        </p>
      </div>

      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Data Sources
      </p>
      <div className="card divide-y divide-line mb-4">
        {DATA_SOURCES.map(({ name, url, desc }) => (
          <a
            key={name}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] items-center justify-between px-5 py-3 transition-colors hover:bg-elevated"
          >
            <div>
              <p className="text-sm font-medium">{name}</p>
              <p className="text-xs text-ink-muted">{desc}</p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          </a>
        ))}
      </div>

      <div className="card p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Built With
        </p>
        <p className="text-sm text-ink-muted">
          React · Supabase · Tailwind CSS · Vite · TypeScript
        </p>
        <p className="mt-4 text-xs text-ink-muted">© 2026 Meridian. All rights reserved.</p>
      </div>
    </div>
  );
}
