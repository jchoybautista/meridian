# Meridian — Phase 3 Design Spec
**Date:** 2026-06-25  
**Scope:** Stock detail parity · Dashboard enhancements · Portfolio page (buy/sell transactions, FIFO P&L)

---

## 1. Goals

1. **Stock/Crypto UX parity** — every feature on the crypto detail page exists on the stock detail page; the only differences are data-driven (crypto has supply/genesis; stocks have analyst ratings/financials/news).
2. **Maximize API data** — surface all meaningful data each free API provides: Twelve Data intervals, FMP fundamentals + analyst ratings + news, CoinGecko trending, Alternative.me Fear & Greed.
3. **Portfolio page** — full buy/sell transaction log with FIFO realized gains, unrealized P&L, allocation chart. Auth-gated via Supabase. Impressive enough to lead a portfolio demo.
4. **Employer impression** — the finished app should look and feel like a real fintech product, not a tutorial project.

---

## 2. New APIs

### 2.1 Twelve Data (stock OHLC — multi-interval)
- **Free tier:** 800 credits/day, 8 req/min. No WebSocket on free.
- **Endpoint:** `GET https://api.twelvedata.com/time_series?symbol=AAPL&interval=1h&outputsize=500&apikey=KEY`
- **Intervals available:** `1min`, `5min`, `15min`, `30min`, `45min`, `1h`, `2h`, `4h`, `1day`, `1week`, `1month`
- **Meridian stock intervals exposed:** `15m → "15min"`, `1h → "1h"`, `4h → "4h"`, `1D → "1day"`, `1W → "1week"`, `1M → "1month"`
- **Historical depth (free):** intraday (15m/1h/4h) = several months to ~2 years; daily/weekly/monthly = full history
- **Response shape:** `{ values: [{ datetime, open, high, low, close, volume }], meta: { symbol, interval } }`
- **Caching:** localStorage per `symbol:interval`; TTL = 2 min for 15m/1h, 10 min for 4h, 60 min for 1D+
- **Env var:** `VITE_TWELVE_DATA_KEY`
- **File:** `src/lib/twelvedata.ts`

### 2.2 Alternative.me Fear & Greed Index (no key)
- **Endpoint:** `GET https://api.alternative.me/fng/?limit=1`
- **Response:** `{ data: [{ value: "72", value_classification: "Greed", timestamp }] }`
- **Caching:** localStorage, TTL 60 min (index updates once a day)
- **File:** added to `src/lib/coingecko.ts` or its own `src/lib/feargreed.ts`

### 2.3 FMP — additional endpoints (existing key, shared 250/day budget)
All responses cached aggressively in localStorage to protect the daily budget.

| Endpoint | TTL | What it provides |
|---|---|---|
| `/grade/{symbol}` | 24 h | Analyst rating counts (Strong Buy / Buy / Hold / Sell / Strong Sell) |
| `/income-statement/{symbol}?period=quarter&limit=4` | 24 h | Revenue, net income, EPS — last 4 quarters |
| `/stock_news?tickers={symbol}&limit=5` | 30 min | Latest 5 news headlines + source + URL |
| `/sector-performance` | 60 min | % change today per market sector |

---

## 3. Stock Detail Page — Full Parity

### 3.1 IntervalPicker — generalized
`IntervalPicker` currently hardcodes `CRYPTO_INTERVALS`. Extend it to accept props:
- `intervals: Interval[]` — the set to display
- `storageKey: string` — separate localStorage key so stock and crypto prefs don't clash
- `defaultPreferred: string[]` — initial quick-tab set

`STOCK_INTERVALS` in `IntervalPicker.tsx`:
```ts
{ label: "15m", tdInterval: "15min", note: "15-minute candles", intraday: true  },
{ label: "1h",  tdInterval: "1h",    note: "1-hour candles",    intraday: true  },
{ label: "4h",  tdInterval: "4h",    note: "4-hour candles",    intraday: true  },
{ label: "1D",  tdInterval: "1day",  note: "Daily candles",     intraday: false },
{ label: "1W",  tdInterval: "1week", note: "Weekly candles",    intraday: false },
{ label: "1M",  tdInterval: "1month",note: "Monthly candles",   intraday: false },
```

Stock default preferred tabs: `["1h", "4h", "1D", "1W"]`  
Stock localStorage key: `"meridian:chart:stock-intervals"`

### 3.2 Chart (Twelve Data)
- `AssetDetail` for stocks: replace `stockPeriod` state + `STOCK_PERIODS` with `stockInterval` state (same pattern as `cryptoInterval`)
- `useAsync` fetches `getStockKlines(symbol, stockInterval.tdInterval)` from `twelvedata.ts`
- Result mapped to `StockOHLCPoint[]` (same shape as Binance → `CandlestickChart` already accepts this)
- Keep FMP `getStockOHLC` as **fallback** when Twelve Data key is not configured (daily data only)
- Chart footnote: `"Daily candles · Live via Twelve Data · scroll & pinch to zoom"` (or interval-specific)

### 3.3 Price Performance section (new for stocks)
Same `PerformanceStat` grid already used on crypto page:

| Metric | Source | How |
|---|---|---|
| 24h | FMP bulk quote `changesPercentage` | Already returned by `getStockQuote` |
| 1 Week | Derived from OHLC history | Find candle closest to 7 days ago → `(currentPrice - closeN) / closeN * 100` |
| 1 Month | Derived from OHLC history | Find candle closest to 30 days ago |
| 1 Year | Derived from OHLC history | Find candle closest to 365 days ago |

Implementation: `getStockOHLC(symbol, "max")` is already fetched for the chart — reuse it for performance calculations. Pure function `calcPerformance(candles, currentPrice): PerfStats`. Zero extra API calls.

### 3.4 Analyst Ratings card (new)
- Source: FMP `/grade/{symbol}` → array of grade entries → count by `grade` field
- Display as a horizontal stacked bar (Strong Buy = dark green, Buy = green, Hold = yellow, Sell = orange, Strong Sell = red) + legend with counts
- Headline: consensus label (e.g. "Buy" if buy+strong buy > 50% of total)
- Positioned: after Market Data grid, before Financial Highlights

### 3.5 Financial Highlights card (new)
- Source: FMP `/income-statement/{symbol}?period=quarter&limit=4`
- Show: Revenue, Net Income, EPS — last 4 quarters as compact grouped bar chart (Recharts `BarChart`)
- Quarter labels on x-axis (e.g. "Q1 '25")
- Revenue and Net Income in compact USD ($1.2B), EPS in dollars

### 3.6 Company News feed (new)
- Source: FMP `/stock_news?tickers={symbol}&limit=5`
- Compact list: headline (truncated to 2 lines), source name + date, external link icon
- Positioned at bottom of page (same section order as crypto's About + categories + website)

### 3.7 Sections order — stock detail page (final)
1. Back link
2. Header (icon, name, symbol, exchange, sector/industry)
3. Price + change badge + polling indicator
4. Price Chart card (IntervalPicker + CandlestickChart via Twelve Data)
5. Market Data grid (24h H/L, Volume, Market Cap, P/E, 52w H/L, Beta, Employees, Avg Volume)
6. Price Performance grid (24h / 1W / 1M / 1Y)
7. Analyst Ratings card
8. Financial Highlights card (quarterly revenue/net income/EPS bar chart)
9. About company card (description, sector/industry tags, CEO, IPO date, website)
10. Company News feed

### 3.8 Crypto detail page — no changes needed
Already has: IntervalPicker, candlestick, live WS price, live candle, market data grid, price performance, about section. ✅

---

## 4. Dashboard Enhancements

### 4.1 CryptoBoard — Fear & Greed Index widget
- New component: `src/components/dashboard/FearGreedGauge.tsx`
- Displays: large number (0–100), classification label, thin colored arc or pill
- Color scale: 0–25 = `#EF4444` (Extreme Fear) · 26–46 = `#F97316` · 47–54 = `#EAB308` · 55–75 = `#22C55E` · 76–100 = `#16A34A`
- Footnote: "Updated daily · Source: Alternative.me"
- Positioned in the bento grid alongside existing widgets

### 4.2 CryptoBoard — Trending Coins widget
- Source: CoinGecko `/trending` (free, no key) → top 7 coins
- New component: `src/components/dashboard/TrendingCoins.tsx`
- Compact list: rank, icon (CoinGecko thumb URL), name, symbol, 24h change badge
- Clicking a row navigates to `/asset/crypto/{id}`

### 4.3 StocksBoard — Sector Performance widget
- Source: FMP `/sector-performance` (free, cached 60 min)
- New component: `src/components/dashboard/SectorPerformance.tsx`
- Horizontal Recharts `BarChart` — each sector as a bar, colored green/red by sign
- Value labels on bars (e.g. "+1.42%")

---

## 5. Portfolio Page (`/portfolio`)

### 5.1 Database schema change
Drop the empty `portfolio_holdings` table stub. Add `portfolio_transactions`:

```sql
create table if not exists public.portfolio_transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users not null,
  asset_id         text not null,          -- CoinGecko id or stock ticker
  asset_symbol     text not null,
  asset_name       text not null,
  asset_type       text not null check (asset_type in ('crypto', 'stock')),
  type             text not null check (type in ('buy', 'sell')),
  quantity         numeric not null check (quantity > 0),
  price_per_unit   numeric not null check (price_per_unit >= 0),
  transacted_at    date not null,
  notes            text,
  created_at       timestamptz default now()
);

alter table public.portfolio_transactions enable row level security;

create policy "Users manage their own transactions"
  on public.portfolio_transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

`supabase/schema.sql` is updated: the old `portfolio_holdings` block is replaced with `portfolio_transactions`. Since no real user data exists yet (the table was a placeholder), we also add a drop-and-recreate migration note at the top of the schema file for anyone who ran the old schema:
```sql
drop table if exists public.portfolio_holdings;
```

### 5.2 P&L logic — `src/lib/portfolio.ts` (pure functions, fully testable)

**Holdings derivation:**
```
holdings = group transactions by asset_id
  for each asset:
    buyLots = buy transactions sorted by transacted_at ASC
    sellLots = sell transactions sorted by transacted_at ASC
    apply FIFO: each sell consumes from the oldest buy lot(s)
    realizedGain += (sellPrice - lotCostBasis) × qty for each matched lot
    remainingLots = buy lots not yet consumed by sells
    avgCostRemaining = weighted average cost of remainingLots
    quantity = sum(remainingLots qty)
    unrealizedGain = quantity × (currentPrice - avgCostRemaining)
```

**Total portfolio value:** `sum(quantity × currentPrice)` across all holdings with quantity > 0  
**Total unrealized P&L:** `sum(unrealizedGain)` across all holdings  
**Total realized P&L:** `sum(realizedGain)` across all assets  
**24h change:** `sum(quantity × currentPrice × change24hPercent / 100)` — requires live prices

**Exported functions:**
- `deriveHoldings(transactions, priceMap): HoldingWithPnL[]`
- `portfolioSummary(holdings): PortfolioSummary`

### 5.3 Page layout

**Route:** `/portfolio` wrapped in `<AuthGuard>`

**Summary bar (top):**
- 4 stat pills: Total Value · Unrealized P&L · Realized P&L · 24h Change
- Unrealized and realized colored green/red; 24h shows pulse dot if live prices active

**Bento row (2-column on desktop, stacked on mobile):**
- Left: Allocation donut chart (`Recharts PieChart`) — slices by current market value per asset, legend with % and name
- Right: Holdings table — columns: Asset (icon+name) | Qty | Avg Cost | Current Price | Unrealized P&L | % of Portfolio

**Add Transaction button:**
- Floating or in page header
- Opens modal: asset search (debounced, searches crypto via CoinGecko `/search` + stocks from `STOCK_UNIVERSE`), Buy/Sell toggle, Quantity input, Price per unit input, Date picker, Notes (optional)
- On submit: `supabase.from('portfolio_transactions').insert(...)` → optimistic update

**Transaction history (bottom):**
- Full log across all assets, sorted newest first
- Each row: asset icon + name | Buy/Sell badge (colored) | qty | price per unit | date | notes icon
- Delete button per row (with confirmation) → recalculates P&L

**Holdings row expand (click):**
- Clicking a row in the holdings table expands it inline to show that asset's transactions only
- Small sub-table: date | type | qty | price | realized P&L (for sell rows)

### 5.4 Live prices for portfolio
- Crypto holdings: reuse existing `useLiveTickers` hook (Binance combined stream)
- Stock holdings: poll FMP bulk quote every 60s (same visibility-gated pattern as Markets page)
- `priceMap: Record<assetId, { price, change24h }>` passed to `deriveHoldings`

### 5.5 Empty state
When no transactions exist: illustration placeholder + "Add your first transaction" CTA button

### 5.6 Auth gate
Unauthenticated users see a redirect to `/login` with `state: { from: '/portfolio' }` so they return after login.

---

## 6. Consistency Principles

| Feature | Crypto detail | Stock detail |
|---|---|---|
| Chart | CandlestickChart + IntervalPicker | CandlestickChart + IntervalPicker ✅ |
| Intervals | 1m/3m/5m/15m/30m/1h/2h/4h/6h/8h/12h/1D/3D/1W/1M | 15m/1h/4h/1D/1W/1M ✅ |
| Live price | Binance WS + LiveDot | FMP poll 60s + polling indicator |
| Price Performance | 24h/7d/30d/1y | 24h/1W/1M/1Y ✅ |
| Market Data grid | Vol, MarketCap, ATH, ATL, Supply | Vol, MarketCap, P/E, 52w H/L, Beta ✅ |
| About section | Description + categories + website | Description + sector/industry + CEO/IPO + website ✅ |
| Extra data | (crypto-specific supply/genesis) | Analyst Ratings + Financial Highlights + News ✅ |

All cards use the same `.card` class, same `Stat` / `PerformanceStat` sub-components, same `ChangeBadge`, same `AssetIcon`. No visual difference between a stock page and a crypto page at a glance.

---

## 7. Files Changed / Created

### New files
- `src/lib/twelvedata.ts` — Twelve Data OHLC fetcher + cache
- `src/lib/feargreed.ts` — Alternative.me Fear & Greed fetcher + cache
- `src/lib/portfolio.ts` — pure FIFO P&L logic (no Supabase, fully testable)
- `src/hooks/usePortfolio.ts` — Supabase transactions CRUD + live price overlay
- `src/pages/Portfolio.tsx` — main portfolio page
- `src/components/dashboard/FearGreedGauge.tsx`
- `src/components/dashboard/TrendingCoins.tsx`
- `src/components/dashboard/SectorPerformance.tsx`
- `src/components/portfolio/AddTransactionModal.tsx`
- `src/components/portfolio/HoldingsTable.tsx`
- `src/components/portfolio/TransactionHistory.tsx`
- `src/components/portfolio/AllocationChart.tsx`
- `src/components/portfolio/SummaryBar.tsx`

### Modified files
- `src/components/charts/IntervalPicker.tsx` — generalize to accept `intervals`, `storageKey`, `defaultPreferred` props; add `tdInterval` field to `Interval` type; add `STOCK_INTERVALS`
- `src/pages/AssetDetail.tsx` — replace `stockPeriod`/`STOCK_PERIODS` with `stockInterval` + IntervalPicker; add Price Performance for stocks; add Analyst Ratings, Financial Highlights, News sections
- `src/lib/fmp.ts` — add `getAnalystRatings`, `getFinancialHighlights`, `getStockNews`, `getSectorPerformance`
- `src/components/dashboard/Dashboard.tsx` (or board files) — add FearGreedGauge + TrendingCoins to CryptoBoard; add SectorPerformance to StocksBoard
- `src/App.tsx` — add `/portfolio` route
- `supabase/schema.sql` — replace `portfolio_holdings` with `portfolio_transactions`

### Test files
- `src/lib/portfolio.test.ts` — unit tests for FIFO logic (buy-only, buy+sell, partial sell, oversell guard)

---

## 8. Out of Scope (future phases)
- Portfolio performance chart over time (requires snapshot storage)
- Price alerts / push notifications
- Brokerage account sync
- RSI / MACD technical indicator overlays
- Export to CSV
