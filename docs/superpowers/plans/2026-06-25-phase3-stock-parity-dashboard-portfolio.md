# Phase 3: Stock Parity · Dashboard Enhancements · Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring stock detail pages to full crypto parity (IntervalPicker + Twelve Data multi-interval OHLC + analyst ratings + financials + news), add three dashboard widgets (Fear & Greed, Trending Coins, Sector Performance), and build the Portfolio page (buy/sell transaction log, FIFO P&L, allocation chart).

**Architecture:** All new API calls follow the established pattern — typed fetcher in `src/lib/`, localStorage cache with per-endpoint TTL, graceful fallback when key is absent. Portfolio P&L is computed client-side in pure functions in `src/lib/portfolio.ts`, keeping Supabase as a dumb data store. The `IntervalPicker` component is generalized with props so it works for both crypto (Binance) and stocks (Twelve Data) without duplication.

**Tech Stack:** React 19 + Vite + TypeScript, Tailwind v3 dark theme, Recharts, lightweight-charts (TradingView), Supabase JS v2, Vitest (tests), lucide-react icons.

## Global Constraints
- Free APIs only — no paid tiers, ever. Twelve Data free = 800/day. FMP free = 250/day (shared budget).
- Env vars: `VITE_TWELVE_DATA_KEY`, `VITE_FMP_KEY` (existing), `VITE_SUPABASE_URL` (existing), `VITE_SUPABASE_ANON_KEY` (existing).
- WCAG 2.1 AA — all interactive elements min 44×44px touch target, labelled.
- Mobile-first responsive — all new components stack on mobile, two-column on desktop.
- Dark theme tokens: base `#0A0E1A`, card `#111827`, brand `#6366F1`, up `#22C55E`, down `#EF4444`.
- TypeScript strict — no `any`, no suppressed errors.
- `npm run build` and `npm test` must stay green after every task.

---

## File Map

**New files:**
- `src/lib/twelvedata.ts` — Twelve Data OHLC fetcher + cache
- `src/lib/feargreed.ts` — Alternative.me Fear & Greed fetcher + cache
- `src/lib/portfolio.ts` — pure FIFO P&L logic (no Supabase, fully testable)
- `src/lib/portfolio.test.ts` — Vitest unit tests for FIFO logic
- `src/hooks/usePortfolio.ts` — Supabase transactions CRUD + live price overlay
- `src/pages/Portfolio.tsx` — Portfolio page (auth-gated)
- `src/components/dashboard/FearGreedGauge.tsx`
- `src/components/dashboard/TrendingCoins.tsx`
- `src/components/dashboard/SectorPerformance.tsx`
- `src/components/portfolio/SummaryBar.tsx`
- `src/components/portfolio/AllocationChart.tsx`
- `src/components/portfolio/HoldingsTable.tsx`
- `src/components/portfolio/AddTransactionModal.tsx`
- `src/components/portfolio/TransactionHistory.tsx`

**Modified files:**
- `src/components/charts/IntervalPicker.tsx` — generalize props; add `STOCK_INTERVALS` + `tdInterval` field
- `src/lib/fmp.ts` — add `getAnalystRatings`, `getFinancialHighlights`, `getStockNews`, `getSectorPerformance`, `calcStockPerformance`
- `src/lib/coingecko.ts` — add `getTrendingCoins`
- `src/pages/AssetDetail.tsx` — wire Twelve Data + IntervalPicker for stocks; add Performance, Analyst, Financials, News sections
- `src/pages/Dashboard.tsx` — add FearGreedGauge + TrendingCoins to CryptoBoard; SectorPerformance to StocksBoard
- `src/App.tsx` — add `/portfolio` route
- `src/types/index.ts` — add `Transaction`, `HoldingWithPnL`, `PortfolioSummary`; remove `PortfolioHolding`
- `supabase/schema.sql` — replace `portfolio_holdings` with `portfolio_transactions`
- `.env.example` — add `VITE_TWELVE_DATA_KEY`

---

## Task 1: Generalize IntervalPicker + add STOCK_INTERVALS

**Files:**
- Modify: `src/components/charts/IntervalPicker.tsx`

**Interfaces produced (used by Tasks 4, 8):**
```ts
export interface Interval {
  label: string;
  note: string;
  intraday: boolean;
  tdInterval?: string; // Twelve Data interval string (stocks only)
}

export const STOCK_INTERVALS: Interval[]
// default preferred for stocks: ["1h","4h","1D","1W"]
// storageKey for stocks: "meridian:chart:stock-intervals"
```

- [ ] **Step 1: Update `Interval` type and add `STOCK_INTERVALS`**

In `src/components/charts/IntervalPicker.tsx`, add `tdInterval?: string` to the `Interval` interface (after `intraday: boolean`) and add `STOCK_INTERVALS` after `CRYPTO_INTERVALS`:

```ts
export interface Interval {
  label: string;
  note: string;
  intraday: boolean;
  tdInterval?: string;
}

export const STOCK_INTERVALS: Interval[] = [
  { label: "15m", tdInterval: "15min", note: "15-minute candles",       intraday: true  },
  { label: "1h",  tdInterval: "1h",    note: "1-hour candles",          intraday: true  },
  { label: "4h",  tdInterval: "4h",    note: "4-hour candles",          intraday: true  },
  { label: "1D",  tdInterval: "1day",  note: "Daily candles",           intraday: false },
  { label: "1W",  tdInterval: "1week", note: "Weekly candles",          intraday: false },
  { label: "1M",  tdInterval: "1month",note: "Monthly candles · full history", intraday: false },
];
```

- [ ] **Step 2: Add props to `IntervalPicker` and update internal logic**

Replace the existing `Props` interface and `IntervalPicker` function signature:

```ts
const DEFAULT_CRYPTO_PREFERRED = ["15m", "1h", "4h", "1D"];
const DEFAULT_STOCK_PREFERRED  = ["1h", "4h", "1D", "1W"];
const CRYPTO_STORAGE_KEY = "meridian:chart:intervals";
const STOCK_STORAGE_KEY  = "meridian:chart:stock-intervals";

interface Props {
  value: string;
  onChange: (interval: Interval) => void;
  intervals?: Interval[];
  storageKey?: string;
  defaultPreferred?: string[];
}

export function IntervalPicker({
  value,
  onChange,
  intervals = CRYPTO_INTERVALS,
  storageKey = CRYPTO_STORAGE_KEY,
  defaultPreferred = DEFAULT_CRYPTO_PREFERRED,
}: Props) {
  const [preferred, setPreferred] = useState<string[]>(() => {
    const validLabels = new Set(intervals.map((i) => i.label));
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaultPreferred;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const cleaned = (parsed as string[]).filter((l) => validLabels.has(l));
        if (cleaned.length > 0) return cleaned;
      }
    } catch { /* ignore */ }
    return defaultPreferred;
  });
```

Update every internal reference to use the prop:
- `selectInterval`: `onChange(getIntervalByLabel(label, intervals))`
- `savePreferred`: `localStorage.setItem(storageKey, JSON.stringify(labels))`
- `saveDraft`: uses `intervals` in `selectInterval` call (already fixed above)
- `currentInterval`: `getIntervalByLabel(value, intervals)`
- The dropdown grid: iterate `intervals` instead of `CRYPTO_INTERVALS`
- The "Edit" mode `toggleDraft` note in the panel footer: replace hardcoded "live via Binance" with interval-agnostic text:

```tsx
{!isEditing && (
  <p className="mt-3 text-[10px] leading-relaxed text-ink-muted">
    {currentInterval.note}
    {intervals === CRYPTO_INTERVALS
      ? " · live via Binance. 1W / 1M show full history back to listing."
      : " · data via Twelve Data."}
  </p>
)}
```

Export the two storage key constants for use in `AssetDetail`:
```ts
export { CRYPTO_STORAGE_KEY, STOCK_STORAGE_KEY, DEFAULT_STOCK_PREFERRED };
```

- [ ] **Step 3: Verify build passes**

```bash
cd "C:/Users/jchoy/Work/AI Projects/meridian"
npm run build
```
Expected: 0 errors. The existing crypto usage `<IntervalPicker value={...} onChange={...} />` still works via defaults.

- [ ] **Step 4: Commit**

```bash
git add src/components/charts/IntervalPicker.tsx
git commit -m "feat: generalize IntervalPicker — accept intervals/storageKey/defaultPreferred props; add STOCK_INTERVALS"
```

---

## Task 2: Add `src/lib/twelvedata.ts`

**Files:**
- Create: `src/lib/twelvedata.ts`
- Modify: `.env.example`

**Interfaces produced (used by Task 4):**
```ts
export const tdConfigured: boolean
export async function getStockKlines(symbol: string, tdInterval: string): Promise<StockOHLCPoint[]>
```

- [ ] **Step 1: Create `src/lib/twelvedata.ts`**

```ts
import type { StockOHLCPoint } from "./fmp";

const BASE = "https://api.twelvedata.com";
const KEY  = import.meta.env.VITE_TWELVE_DATA_KEY as string | undefined;

export const tdConfigured = Boolean(KEY);

interface TDBar {
  datetime: string; // "2024-03-15 09:30:00" or "2024-03-15"
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface TDResponse {
  values?: TDBar[];
  status?: string;
  code?: number;
  message?: string;
}

/** Cache TTLs by interval type. */
function cacheTtl(tdInterval: string): number {
  if (tdInterval === "15min" || tdInterval === "1h") return 2 * 60 * 1000;
  if (tdInterval === "4h") return 10 * 60 * 1000;
  return 60 * 60 * 1000; // 1day / 1week / 1month
}

function cacheKey(symbol: string, interval: string) {
  return `meridian:td:${symbol.toUpperCase()}:${interval}`;
}

function readCache(key: string, ttl: number): StockOHLCPoint[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: StockOHLCPoint[]; ts: number };
    return Date.now() - ts < ttl ? data : null;
  } catch { return null; }
}

function writeCache(key: string, data: StockOHLCPoint[]): void {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch { /* ignore */ }
}

function mapBar(b: TDBar): StockOHLCPoint | null {
  const time = Math.floor(new Date(b.datetime).getTime() / 1000);
  if (Number.isNaN(time)) return null;
  return {
    time,
    open:   parseFloat(b.open),
    high:   parseFloat(b.high),
    low:    parseFloat(b.low),
    close:  parseFloat(b.close),
    volume: parseFloat(b.volume) || undefined,
  };
}

/**
 * Fetch OHLC candles for a stock from Twelve Data.
 * Returns empty array if key not configured or request fails (caller falls back to FMP daily).
 */
export async function getStockKlines(
  symbol: string,
  tdInterval: string,
  outputsize = 500,
): Promise<StockOHLCPoint[]> {
  if (!KEY) return [];

  const ck  = cacheKey(symbol, tdInterval);
  const ttl = cacheTtl(tdInterval);
  const hit = readCache(ck, ttl);
  if (hit) return hit;

  try {
    const url =
      `${BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${tdInterval}` +
      `&outputsize=${outputsize}&apikey=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Twelve Data ${res.status}`);
    const body = (await res.json()) as TDResponse;
    if (body.status === "error" || !Array.isArray(body.values)) {
      throw new Error(body.message ?? "Twelve Data error");
    }
    const data: StockOHLCPoint[] = (body.values ?? [])
      .map(mapBar)
      .filter((p): p is StockOHLCPoint => p !== null)
      .sort((a, b) => a.time - b.time);

    writeCache(ck, data);
    return data;
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Add env var to `.env.example`**

Open `.env.example` and add below the existing FMP line:
```
VITE_TWELVE_DATA_KEY=your_twelvedata_key_here
```
Sign up free at https://twelvedata.com

- [ ] **Step 3: Build check**

```bash
npm run build
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/twelvedata.ts .env.example
git commit -m "feat: add Twelve Data lib for multi-interval stock OHLC"
```

---

## Task 3: Add FMP functions (analyst ratings, financials, news, sector, stock perf)

**Files:**
- Modify: `src/lib/fmp.ts`

**Interfaces produced (used by Tasks 6, 7, 10, AssetDetail):**
```ts
export interface AnalystRatings { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number; consensus: string; }
export interface QuarterlyFinancial { quarter: string; revenue: number; netIncome: number; eps: number; }
export interface StockNewsItem { title: string; publishedDate: string; site: string; url: string; }
export interface SectorData { sector: string; changesPercentage: number; }
export interface StockPerfStats { change24h: number; change1W?: number; change1M?: number; change1Y?: number; }
export function calcStockPerformance(candles: StockOHLCPoint[], currentPrice: number, change24h: number): StockPerfStats
export async function getAnalystRatings(symbol: string): Promise<AnalystRatings | null>
export async function getFinancialHighlights(symbol: string): Promise<QuarterlyFinancial[]>
export async function getStockNews(symbol: string): Promise<StockNewsItem[]>
export async function getSectorPerformance(): Promise<SectorData[]>
```

- [ ] **Step 1: Add types and `calcStockPerformance` to `src/lib/fmp.ts`**

Append to `src/lib/fmp.ts`:

```ts
// ─── Stock performance (derived from OHLC history) ──────────────────────────

export interface StockPerfStats {
  change24h: number;
  change1W?: number;
  change1M?: number;
  change1Y?: number;
}

function findNearestCandle(candles: StockOHLCPoint[], targetSec: number): StockOHLCPoint | undefined {
  return candles.reduce<StockOHLCPoint | undefined>((best, c) => {
    if (!best) return c;
    return Math.abs(c.time - targetSec) < Math.abs(best.time - targetSec) ? c : best;
  }, undefined);
}

/** Derive 1W/1M/1Y % change from sorted OHLC candles + live price. Zero extra API calls. */
export function calcStockPerformance(
  candles: StockOHLCPoint[],
  currentPrice: number,
  change24h: number,
): StockPerfStats {
  if (candles.length === 0) return { change24h };
  const now = Math.floor(Date.now() / 1000);
  const pct = (c?: StockOHLCPoint) =>
    c && c.close > 0 ? ((currentPrice - c.close) / c.close) * 100 : undefined;
  return {
    change24h,
    change1W: pct(findNearestCandle(candles, now - 7 * 86400)),
    change1M: pct(findNearestCandle(candles, now - 30 * 86400)),
    change1Y: pct(findNearestCandle(candles, now - 365 * 86400)),
  };
}
```

- [ ] **Step 2: Add `getAnalystRatings`**

```ts
// ─── Analyst ratings ─────────────────────────────────────────────────────────

export interface AnalystRatings {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  consensus: string; // "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell"
}

interface FMPGrade { grade: string; }

export async function getAnalystRatings(symbol: string): Promise<AnalystRatings | null> {
  if (!KEY) return null;
  const ck = `meridian:fmp:grades:${symbol}`;
  try {
    const cached = localStorage.getItem(ck);
    if (cached) {
      const { data, ts } = JSON.parse(cached) as { data: AnalystRatings; ts: number };
      if (Date.now() - ts < 24 * 60 * 60 * 1000) return data;
    }
  } catch { /* ignore */ }

  try {
    const url = `${BASE}/grade/${symbol}?limit=50&apikey=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`FMP grade ${res.status}`);
    const data = (await res.json()) as FMPGrade[];
    if (!Array.isArray(data)) return null;

    const counts = { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 };
    for (const { grade } of data) {
      const g = grade.toLowerCase();
      if (g.includes("strong buy") || g === "outperform" || g === "overweight") counts.strongBuy++;
      else if (g === "buy" || g === "accumulate") counts.buy++;
      else if (g === "hold" || g === "neutral" || g === "equal weight" || g === "sector perform") counts.hold++;
      else if (g === "sell" || g === "underperform" || g === "underweight") counts.sell++;
      else if (g === "strong sell") counts.strongSell++;
    }
    const total = counts.strongBuy + counts.buy + counts.hold + counts.sell + counts.strongSell;
    if (total === 0) return null;

    const bullish = counts.strongBuy + counts.buy;
    const bearish = counts.sell + counts.strongSell;
    let consensus = "Hold";
    if (bullish / total > 0.6) consensus = bullish / total > 0.8 ? "Strong Buy" : "Buy";
    else if (bearish / total > 0.6) consensus = bearish / total > 0.8 ? "Strong Sell" : "Sell";

    const result: AnalystRatings = { ...counts, consensus };
    try { localStorage.setItem(ck, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return null; }
}
```

- [ ] **Step 3: Add `getFinancialHighlights`**

```ts
// ─── Quarterly financials ────────────────────────────────────────────────────

export interface QuarterlyFinancial {
  quarter: string; // e.g. "Q1 '25"
  revenue: number;
  netIncome: number;
  eps: number;
}

interface FMPIncomeStatement {
  date: string;
  revenue: number;
  netIncome: number;
  eps: number;
}

export async function getFinancialHighlights(symbol: string): Promise<QuarterlyFinancial[]> {
  if (!KEY) return [];
  const ck = `meridian:fmp:income:${symbol}`;
  try {
    const cached = localStorage.getItem(ck);
    if (cached) {
      const { data, ts } = JSON.parse(cached) as { data: QuarterlyFinancial[]; ts: number };
      if (Date.now() - ts < 24 * 60 * 60 * 1000) return data;
    }
  } catch { /* ignore */ }

  try {
    const url = `${BASE}/income-statement/${symbol}?period=quarter&limit=4&apikey=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`FMP income ${res.status}`);
    const data = (await res.json()) as FMPIncomeStatement[];
    if (!Array.isArray(data)) return [];

    const result: QuarterlyFinancial[] = data
      .slice(0, 4)
      .map((s) => {
        const d = new Date(s.date);
        const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} '${String(d.getFullYear()).slice(2)}`;
        return { quarter: q, revenue: s.revenue, netIncome: s.netIncome, eps: s.eps };
      })
      .reverse(); // oldest first for chart
    try { localStorage.setItem(ck, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return []; }
}
```

- [ ] **Step 4: Add `getStockNews`**

```ts
// ─── Stock news ──────────────────────────────────────────────────────────────

export interface StockNewsItem {
  title: string;
  publishedDate: string;
  site: string;
  url: string;
}

interface FMPNewsItem {
  title: string;
  publishedDate: string;
  site: string;
  url: string;
}

export async function getStockNews(symbol: string): Promise<StockNewsItem[]> {
  if (!KEY) return [];
  const ck = `meridian:fmp:news:${symbol}`;
  const TTL = 30 * 60 * 1000;
  try {
    const cached = localStorage.getItem(ck);
    if (cached) {
      const { data, ts } = JSON.parse(cached) as { data: StockNewsItem[]; ts: number };
      if (Date.now() - ts < TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const url = `${BASE}/stock_news?tickers=${symbol}&limit=5&apikey=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`FMP news ${res.status}`);
    const data = (await res.json()) as FMPNewsItem[];
    if (!Array.isArray(data)) return [];
    const result = data.slice(0, 5).map((n) => ({
      title: n.title,
      publishedDate: n.publishedDate,
      site: n.site,
      url: n.url,
    }));
    try { localStorage.setItem(ck, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return []; }
}
```

- [ ] **Step 5: Add `getSectorPerformance`**

```ts
// ─── Sector performance ──────────────────────────────────────────────────────

export interface SectorData {
  sector: string;
  changesPercentage: number;
}

interface FMPSector {
  sector: string;
  changesPercentage: string; // e.g. "1.23%"
}

export async function getSectorPerformance(): Promise<SectorData[]> {
  if (!KEY) return [];
  const ck = "meridian:fmp:sectors";
  const TTL = 60 * 60 * 1000;
  try {
    const cached = localStorage.getItem(ck);
    if (cached) {
      const { data, ts } = JSON.parse(cached) as { data: SectorData[]; ts: number };
      if (Date.now() - ts < TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const url = `${BASE}/sector-performance?apikey=${KEY}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`FMP sectors ${res.status}`);
    const data = (await res.json()) as FMPSector[];
    if (!Array.isArray(data)) return [];
    const result = data.map((s) => ({
      sector: s.sector,
      changesPercentage: parseFloat(s.changesPercentage.replace("%", "")),
    }));
    try { localStorage.setItem(ck, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return []; }
}
```

- [ ] **Step 6: Build check**

```bash
npm run build
```
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/fmp.ts
git commit -m "feat: add FMP analyst ratings, quarterly financials, stock news, sector performance, calcStockPerformance"
```

---

## Task 4: Wire IntervalPicker + Twelve Data into AssetDetail (stock chart)

**Files:**
- Modify: `src/pages/AssetDetail.tsx`

**What changes:** Remove `STOCK_PERIODS`/`stockPeriod`/`stockArea` state; replace with `stockInterval` state + `useAsync` calling `getStockKlines`. Keep FMP `getStockOHLC` as fallback when TD key absent.

- [ ] **Step 1: Update imports in `AssetDetail.tsx`**

Add to existing imports:
```ts
import { getStockKlines, tdConfigured } from "../lib/twelvedata";
import {
  STOCK_INTERVALS,
  STOCK_STORAGE_KEY,
  DEFAULT_STOCK_PREFERRED,
  getIntervalByLabel,
} from "../components/charts/IntervalPicker";
// (CRYPTO_INTERVALS already imported)
```

Remove from imports: nothing existing is removed — just add the new ones.

- [ ] **Step 2: Replace `stockPeriod` state + `STOCK_PERIODS` with `stockInterval`**

Remove these lines (around line 44–74 of the original file):
```ts
interface StockPeriod { label: string; days: number | "max"; }
const STOCK_PERIODS: StockPeriod[] = [ ... ];
```
And replace `const [stockPeriod, setStockPeriod] = useState<StockPeriod>(STOCK_PERIODS[1]);` with:
```ts
const [stockInterval, setStockInterval] = useState<Interval>(
  () => getIntervalByLabel("1D", STOCK_INTERVALS),
);
```

- [ ] **Step 3: Replace `stockOHLC` and `stockArea` useAsync calls**

Remove the existing `stockOHLC` and `stockArea` useAsync blocks and replace with:

```ts
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
```

Remove `stockArea` entirely — it was only needed when neither FMP nor AV keys existed. With Twelve Data, there's always OHLC data (or FMP fallback).

- [ ] **Step 4: Remove `stockPeriod`-based slicing and fix `stockCandles`**

Remove the `stockCandles` slice logic (it sliced by `stockPeriod.days`). Replace with:
```ts
const stockCandles: StockOHLCPoint[] = stockOHLC.data ?? [];
```

Twelve Data already returns only the requested outputsize (500 bars) for the selected interval.

- [ ] **Step 5: Update the chart card JSX — replace the stock period tab strip with IntervalPicker**

In the chart card header, replace:
```tsx
// OLD
<div role="tablist" ...>
  {STOCK_PERIODS.map((p) => ( ... ))}
</div>
```
With:
```tsx
<IntervalPicker
  value={stockInterval.label}
  onChange={setStockInterval}
  intervals={STOCK_INTERVALS}
  storageKey={STOCK_STORAGE_KEY}
  defaultPreferred={DEFAULT_STOCK_PREFERRED}
/>
```

- [ ] **Step 6: Update stock chart render — remove `stockArea` fallback branch**

Replace:
```tsx
// OLD stock chart section
{stockOHLC.loading ? (
  <div className="h-[340px] w-full skeleton ..." />
) : useStockCandlestick ? (
  <CandlestickChart data={stockCandles as OHLCPoint[]} trend={trend} />
) : stockArea.data && stockArea.data.length > 0 ? (
  <PriceChart data={stockArea.data} trend={trend} />
) : (
  <div className="h-[340px] w-full skeleton ..." />
)}
```
With:
```tsx
{stockOHLC.loading ? (
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
```

Remove the `const useStockCandlestick = stockCandles.length > 0;` line.

- [ ] **Step 7: Build and verify**

```bash
npm run build
```
Expected: 0 errors. Open the dev server, navigate to a stock detail page, confirm IntervalPicker shows 1h/4h/1D/1W tabs, confirm candlestick renders.

- [ ] **Step 8: Commit**

```bash
git add src/pages/AssetDetail.tsx
git commit -m "feat: stock detail — replace period tabs with IntervalPicker + Twelve Data multi-interval OHLC"
```

---

## Task 5: Add Price Performance section for stocks + Analyst, Financials, News sections

**Files:**
- Modify: `src/pages/AssetDetail.tsx`

- [ ] **Step 1: Add `stockPerf` derived value**

After the `stockOHLC` useAsync, add:
```ts
const stockPerf = useMemo(() => {
  if (isCrypto || !asset || !stockOHLC.data) return null;
  return calcStockPerformance(stockOHLC.data, asset.price, asset.change24h);
}, [isCrypto, asset, stockOHLC.data]);
```

Add `calcStockPerformance` to the fmp import line.

- [ ] **Step 2: Add `analystRatings`, `financials`, `stockNews` useAsync calls**

After `stockProfile` useAsync, add:
```ts
const analystRatings = useAsync<AnalystRatings | null>(async () => {
  if (!id || isCrypto) return null;
  return getAnalystRatings(id.toUpperCase());
}, [type, id]);

const financials = useAsync<QuarterlyFinancial[]>(async () => {
  if (!id || isCrypto) return [];
  return getFinancialHighlights(id.toUpperCase());
}, [type, id]);

const stockNews = useAsync<StockNewsItem[]>(async () => {
  if (!id || isCrypto) return [];
  return getStockNews(id.toUpperCase());
}, [type, id]);
```

Add `AnalystRatings`, `QuarterlyFinancial`, `StockNewsItem`, `getAnalystRatings`, `getFinancialHighlights`, `getStockNews` to the fmp import line.

- [ ] **Step 3: Add Price Performance section for stocks in the JSX**

After the Market Data grid (`</div>` closing the stats `dl`) and before the existing crypto Price Performance section, insert:

```tsx
{/* ── Stock Price Performance ── */}
{!isCrypto && stockPerf && (
  <div className="mb-6">
    <h2 className="mb-3 text-sm font-semibold text-ink-muted uppercase tracking-wide">Price Performance</h2>
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <PerformanceStat label="24h"    value={stockPerf.change24h} />
      {stockPerf.change1W !== undefined && <PerformanceStat label="1 Week"  value={stockPerf.change1W} />}
      {stockPerf.change1M !== undefined && <PerformanceStat label="1 Month" value={stockPerf.change1M} />}
      {stockPerf.change1Y !== undefined && <PerformanceStat label="1 Year"  value={stockPerf.change1Y} />}
    </dl>
  </div>
)}
```

- [ ] **Step 4: Add Analyst Ratings card for stocks**

After the Price Performance section above, insert:

```tsx
{/* ── Analyst Ratings ── */}
{!isCrypto && analystRatings.data && (
  <div className="card mb-6 p-5">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold">Analyst Ratings</h2>
      <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${
        analystRatings.data.consensus.includes("Buy")  ? "bg-up/15 text-up" :
        analystRatings.data.consensus.includes("Sell") ? "bg-down/15 text-down" :
        "bg-elevated text-ink-muted"
      }`}>
        {analystRatings.data.consensus}
      </span>
    </div>
    <AnalystBar ratings={analystRatings.data} />
  </div>
)}
```

Add the `AnalystBar` sub-component at the bottom of the file (after `AboutStock`):

```tsx
function AnalystBar({ ratings }: { ratings: AnalystRatings }) {
  const { strongBuy, buy, hold, sell, strongSell } = ratings;
  const total = strongBuy + buy + hold + sell + strongSell;
  if (total === 0) return null;
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;
  const segments = [
    { label: "Strong Buy", count: strongBuy, color: "bg-[#16A34A]" },
    { label: "Buy",        count: buy,       color: "bg-up" },
    { label: "Hold",       count: hold,      color: "bg-yellow-400" },
    { label: "Sell",       count: sell,      color: "bg-orange-500" },
    { label: "Strong Sell",count: strongSell,color: "bg-down" },
  ].filter((s) => s.count > 0);

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {segments.map((s) => (
          <div
            key={s.label}
            className={`${s.color} transition-all`}
            style={{ width: pct(s.count) }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-muted">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span className={`inline-block h-2 w-2 rounded-full ${s.color}`} />
            {s.label} ({s.count})
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add Financial Highlights card for stocks**

After the Analyst Ratings block, insert:

```tsx
{/* ── Financial Highlights ── */}
{!isCrypto && financials.data && financials.data.length > 0 && (
  <div className="card mb-6 p-5">
    <h2 className="mb-4 text-sm font-semibold">Financial Highlights</h2>
    <FinancialChart data={financials.data} />
  </div>
)}
```

Add `FinancialChart` sub-component (uses Recharts — already a project dependency):

```tsx
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatCompactUsd } from "../lib/format";

function FinancialChart({ data }: { data: QuarterlyFinancial[] }) {
  return (
    <div className="space-y-4">
      {/* Revenue */}
      <div>
        <p className="mb-1 text-xs text-ink-muted">Revenue</p>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              formatter={(v: number) => [formatCompactUsd(v), "Revenue"]}
              contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill="#6366F1" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Net Income */}
      <div>
        <p className="mb-1 text-xs text-ink-muted">Net Income</p>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              formatter={(v: number) => [formatCompactUsd(v), "Net Income"]}
              contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="netIncome" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => <Cell key={i} fill={d.netIncome >= 0 ? "#22C55E" : "#EF4444"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* EPS row */}
      <div className="grid grid-cols-4 gap-3">
        {data.map((d) => (
          <div key={d.quarter} className="rounded-lg bg-elevated p-3 text-center">
            <p className="text-[10px] text-ink-muted">{d.quarter}</p>
            <p className={`text-sm font-bold tabular-nums ${d.eps >= 0 ? "text-up" : "text-down"}`}>
              {d.eps >= 0 ? "+" : ""}{d.eps.toFixed(2)} EPS
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Add Company News feed for stocks**

Replace the existing `{!isCrypto && <AboutStock ... />}` block — keep it, but add news *after* it:

```tsx
{!isCrypto && stockNews.data && stockNews.data.length > 0 && (
  <section className="card mt-6 p-5" aria-labelledby="news-heading">
    <h2 id="news-heading" className="mb-4 text-sm font-semibold">Company News</h2>
    <ul className="space-y-3">
      {stockNews.data.map((item, i) => (
        <li key={i} className="border-b border-line pb-3 last:border-0 last:pb-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <p className="line-clamp-2 text-sm font-medium group-hover:text-brand transition-colors">
              {item.title}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {item.site} · {new Date(item.publishedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </a>
        </li>
      ))}
    </ul>
  </section>
)}
```

- [ ] **Step 7: Build and smoke-test**

```bash
npm run build
```
Open a stock detail page in the browser. Verify: IntervalPicker → chart changes. Price Performance section shows 4 colored stats. If FMP key is configured: Analyst Ratings stacked bar appears, Financial Highlights charts appear, Company News list appears.

- [ ] **Step 8: Commit**

```bash
git add src/pages/AssetDetail.tsx
git commit -m "feat: stock detail — price performance, analyst ratings, financial highlights, company news"
```

---

## Task 6: Dashboard — Fear & Greed Index widget

**Files:**
- Create: `src/lib/feargreed.ts`
- Create: `src/components/dashboard/FearGreedGauge.tsx`
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Create `src/lib/feargreed.ts`**

```ts
const ENDPOINT = "https://api.alternative.me/fng/?limit=1";
const CACHE_KEY = "meridian:feargreed";
const TTL = 60 * 60 * 1000; // 1 hour

export interface FearGreedData {
  value: number;           // 0–100
  classification: string;  // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
}

interface FNGResponse {
  data: Array<{ value: string; value_classification: string }>;
}

export async function getFearGreed(): Promise<FearGreedData | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached) as { data: FearGreedData; ts: number };
      if (Date.now() - ts < TTL) return data;
    }
  } catch { /* ignore */ }

  try {
    const res = await fetch(ENDPOINT, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Fear & Greed ${res.status}`);
    const body = (await res.json()) as FNGResponse;
    const item = body?.data?.[0];
    if (!item) throw new Error("Empty response");
    const result: FearGreedData = {
      value: parseInt(item.value, 10),
      classification: item.value_classification,
    };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() })); } catch { /* ignore */ }
    return result;
  } catch { return null; }
}
```

- [ ] **Step 2: Create `src/components/dashboard/FearGreedGauge.tsx`**

```tsx
import { useAsync } from "../../hooks/useAsync";
import { getFearGreed } from "../../lib/feargreed";
import { Panel } from "./Panel";

function fgColor(value: number): string {
  if (value <= 25) return "#EF4444";
  if (value <= 46) return "#F97316";
  if (value <= 54) return "#EAB308";
  if (value <= 75) return "#22C55E";
  return "#16A34A";
}

export function FearGreedGauge() {
  const { data, loading } = useAsync(getFearGreed, []);

  return (
    <Panel title="Market Sentiment" subtitle="Fear & Greed Index">
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <div className="skeleton h-24 w-24 rounded-full" aria-hidden="true" />
        </div>
      ) : data ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 pb-4">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full border-4 text-3xl font-extrabold tabular-nums"
            style={{ borderColor: fgColor(data.value), color: fgColor(data.value) }}
            aria-label={`Fear and Greed Index: ${data.value} — ${data.classification}`}
          >
            {data.value}
          </div>
          <p className="text-sm font-semibold" style={{ color: fgColor(data.value) }}>
            {data.classification}
          </p>
          <p className="text-[10px] text-ink-muted">Updated daily · Source: Alternative.me</p>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-ink-muted">
          Unavailable
        </div>
      )}
    </Panel>
  );
}
```

- [ ] **Step 3: Add `FearGreedGauge` to `CryptoBoard` in `Dashboard.tsx`**

Import it:
```ts
import { FearGreedGauge } from "../components/dashboard/FearGreedGauge";
```

In the second bento row of `CryptoBoard`, replace `<LatestBlocks />` position — add it as a new panel. The second row currently has: `DominancePie | eth FeaturedCoin | btc FeaturedCoin | LatestBlocks`. Keep `LatestBlocks` but squeeze `FearGreedGauge` into the layout by adding a third row:

```tsx
<div className={`mb-4 ${ROW}`}>
  <FearGreedGauge />
  <TrendingCoins />   {/* added in Task 7 */}
  <LatestBlocks />
  {/* 4th slot: keep ExploreAssets below */}
</div>
```

For now (before Task 7 adds `TrendingCoins`), put a `<PanelSkeleton title="Trending" />` placeholder in that slot.

- [ ] **Step 4: Build check**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/feargreed.ts src/components/dashboard/FearGreedGauge.tsx src/pages/Dashboard.tsx
git commit -m "feat: dashboard — Fear & Greed Index widget (Alternative.me, no API key)"
```

---

## Task 7: Dashboard — Trending Coins widget

**Files:**
- Modify: `src/lib/coingecko.ts`
- Create: `src/components/dashboard/TrendingCoins.tsx`
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Add `getTrendingCoins` to `src/lib/coingecko.ts`**

```ts
export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;    // small image URL
  rank: number;
  change24h?: number;
}

export async function getTrendingCoins(): Promise<TrendingCoin[]> {
  const url = `${BASE}/search/trending`;
  try {
    const data = await getJson<{
      coins: Array<{ item: { id: string; name: string; symbol: string; thumb: string; market_cap_rank: number; data?: { price_change_percentage_24h?: { usd?: number } } } }>;
    }>(url);
    return data.coins.slice(0, 7).map((c) => ({
      id: c.item.id,
      name: c.item.name,
      symbol: c.item.symbol.toUpperCase(),
      thumb: c.item.thumb,
      rank: c.item.market_cap_rank ?? 0,
      change24h: c.item.data?.price_change_percentage_24h?.usd,
    }));
  } catch { return []; }
}
```

- [ ] **Step 2: Create `src/components/dashboard/TrendingCoins.tsx`**

```tsx
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getTrendingCoins } from "../../lib/coingecko";
import { ChangeBadge } from "../ui/ChangeBadge";
import { Panel } from "./Panel";

export function TrendingCoins() {
  const { data, loading } = useAsync(getTrendingCoins, []);
  const navigate = useNavigate();

  return (
    <Panel title="Trending" subtitle="Top coins right now">
      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
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
                <span className="w-4 text-[10px] text-ink-muted">{i + 1}</span>
                <img src={coin.thumb} alt="" className="h-5 w-5 rounded-full" aria-hidden="true" />
                <span className="flex-1 min-w-0">
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
```

- [ ] **Step 3: Replace the `TrendingCoins` placeholder in `Dashboard.tsx` with the real component**

Import it and replace `<PanelSkeleton title="Trending" />`:
```ts
import { TrendingCoins } from "../components/dashboard/TrendingCoins";
```
```tsx
<TrendingCoins />
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/coingecko.ts src/components/dashboard/TrendingCoins.tsx src/pages/Dashboard.tsx
git commit -m "feat: dashboard — Trending Coins widget (CoinGecko /trending)"
```

---

## Task 8: Dashboard — Sector Performance widget

**Files:**
- Create: `src/components/dashboard/SectorPerformance.tsx`
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Create `src/components/dashboard/SectorPerformance.tsx`**

```tsx
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
} from "recharts";
import { useAsync } from "../../hooks/useAsync";
import { getSectorPerformance } from "../../lib/fmp";
import { Panel } from "./Panel";

export function SectorPerformance() {
  const { data, loading } = useAsync(getSectorPerformance, []);

  const sorted = (data ?? []).sort((a, b) => b.changesPercentage - a.changesPercentage);

  return (
    <Panel title="Sector Performance" subtitle="Today's change by sector">
      {loading ? (
        <div className="skeleton h-full min-h-[200px] rounded-lg" aria-hidden="true" />
      ) : sorted.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-ink-muted">
          Add an FMP key to see sector data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide domain={["auto", "auto"]} />
            <YAxis
              type="category"
              dataKey="sector"
              tick={{ fontSize: 10, fill: "#6B7280" }}
              width={110}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v: number) => [`${v > 0 ? "+" : ""}${v.toFixed(2)}%`, "Change"]}
              contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="changesPercentage" radius={[0, 3, 3, 0]} label={{ position: "right", fontSize: 10, fill: "#9CA3AF", formatter: (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%` }}>
              {sorted.map((s, i) => (
                <Cell key={i} fill={s.changesPercentage >= 0 ? "#22C55E" : "#EF4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}
```

- [ ] **Step 2: Add `SectorPerformance` to `StocksBoard` in `Dashboard.tsx`**

Import:
```ts
import { SectorPerformance } from "../components/dashboard/SectorPerformance";
```

In `StocksBoard`, replace the second bento row (currently 4 `FeaturedCoin` cards):
```tsx
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
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/SectorPerformance.tsx src/pages/Dashboard.tsx
git commit -m "feat: dashboard — Sector Performance widget (FMP)"
```

---

## Task 9: Update schema + types for Portfolio

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update `supabase/schema.sql`**

Replace the entire `-- Portfolio holdings` block with:

```sql
-- Drop old placeholder if it was run previously
drop table if exists public.portfolio_holdings;

-- Portfolio transactions (buy/sell log — holdings and P&L are derived client-side) ----
create table if not exists public.portfolio_transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users not null,
  asset_id         text not null,
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

- [ ] **Step 2: Update `src/types/index.ts`**

Remove `PortfolioHolding`. Add:

```ts
export interface Transaction {
  id: string;
  user_id: string;
  asset_id: string;
  asset_symbol: string;
  asset_name: string;
  asset_type: AssetType;
  type: "buy" | "sell";
  quantity: number;
  price_per_unit: number;
  transacted_at: string; // "YYYY-MM-DD"
  notes?: string | null;
  created_at: string;
}

export interface PriceInfo {
  price: number;
  change24h: number;
}

export interface HoldingWithPnL {
  asset_id: string;
  asset_symbol: string;
  asset_name: string;
  asset_type: AssetType;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPct: number;
  realizedPnL: number;
  change24h: number;
  transactions: Transaction[];
}

export interface PortfolioSummary {
  totalValue: number;
  totalUnrealized: number;
  totalRealized: number;
  dailyChange: number;
  dailyChangePct: number;
}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add supabase/schema.sql src/types/index.ts
git commit -m "feat: portfolio schema (portfolio_transactions table) + Transaction/HoldingWithPnL types"
```

---

## Task 10: `src/lib/portfolio.ts` + tests (FIFO P&L)

**Files:**
- Create: `src/lib/portfolio.ts`
- Create: `src/lib/portfolio.test.ts`

**Interfaces consumed:** `Transaction`, `PriceInfo`, `HoldingWithPnL`, `PortfolioSummary` from `../types`
**Interfaces produced:** `deriveHoldings`, `portfolioSummary`

- [ ] **Step 1: Write the failing tests first**

Create `src/lib/portfolio.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deriveHoldings, portfolioSummary } from "./portfolio";
import type { Transaction } from "../types";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "1", user_id: "u", asset_id: "bitcoin", asset_symbol: "BTC",
    asset_name: "Bitcoin", asset_type: "crypto", type: "buy",
    quantity: 1, price_per_unit: 30000, transacted_at: "2024-01-01",
    notes: null, created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const priceMap = { bitcoin: { price: 40000, change24h: 2 } };

describe("deriveHoldings", () => {
  it("buy only — quantity and avgCost are correct", () => {
    const txns: Transaction[] = [
      tx({ id: "1", quantity: 1, price_per_unit: 30000, transacted_at: "2024-01-01" }),
      tx({ id: "2", quantity: 2, price_per_unit: 45000, transacted_at: "2024-02-01" }),
    ];
    const [h] = deriveHoldings(txns, priceMap);
    expect(h.quantity).toBeCloseTo(3);
    expect(h.avgCost).toBeCloseTo((30000 + 90000) / 3);
    expect(h.realizedPnL).toBe(0);
    expect(h.unrealizedPnL).toBeCloseTo((40000 - h.avgCost) * 3);
  });

  it("sell consumes FIFO lots and records realized gain", () => {
    const txns: Transaction[] = [
      tx({ id: "1", type: "buy",  quantity: 2, price_per_unit: 30000, transacted_at: "2024-01-01" }),
      tx({ id: "2", type: "sell", quantity: 1, price_per_unit: 50000, transacted_at: "2024-03-01" }),
    ];
    const [h] = deriveHoldings(txns, priceMap);
    expect(h.quantity).toBeCloseTo(1);
    expect(h.realizedPnL).toBeCloseTo(20000); // (50000 - 30000) × 1
    expect(h.avgCost).toBeCloseTo(30000);      // remaining lot cost
  });

  it("partial lot sell — remaining lot qty correct", () => {
    const txns: Transaction[] = [
      tx({ id: "1", type: "buy",  quantity: 3, price_per_unit: 20000, transacted_at: "2024-01-01" }),
      tx({ id: "2", type: "sell", quantity: 1, price_per_unit: 25000, transacted_at: "2024-02-01" }),
    ];
    const [h] = deriveHoldings(txns, priceMap);
    expect(h.quantity).toBeCloseTo(2);
    expect(h.realizedPnL).toBeCloseTo(5000);
    expect(h.avgCost).toBeCloseTo(20000);
  });

  it("oversell beyond held qty — remaining quantity is 0, no crash", () => {
    const txns: Transaction[] = [
      tx({ id: "1", type: "buy",  quantity: 1, price_per_unit: 30000, transacted_at: "2024-01-01" }),
      tx({ id: "2", type: "sell", quantity: 5, price_per_unit: 50000, transacted_at: "2024-02-01" }),
    ];
    const [h] = deriveHoldings(txns, priceMap);
    expect(h.quantity).toBe(0);
    expect(h.marketValue).toBe(0);
  });

  it("asset with quantity 0 is excluded from holdings", () => {
    const txns: Transaction[] = [
      tx({ id: "1", type: "buy",  quantity: 1, price_per_unit: 30000, transacted_at: "2024-01-01" }),
      tx({ id: "2", type: "sell", quantity: 1, price_per_unit: 50000, transacted_at: "2024-02-01" }),
    ];
    const holdings = deriveHoldings(txns, priceMap);
    expect(holdings).toHaveLength(0);
  });
});

describe("portfolioSummary", () => {
  it("sums totalValue, unrealized, realized, and dailyChange correctly", () => {
    const txns: Transaction[] = [
      tx({ quantity: 1, price_per_unit: 30000, transacted_at: "2024-01-01" }),
    ];
    const holdings = deriveHoldings(txns, priceMap);
    const summary = portfolioSummary(holdings);
    expect(summary.totalValue).toBeCloseTo(40000);
    expect(summary.totalUnrealized).toBeCloseTo(10000);
    expect(summary.totalRealized).toBe(0);
    // dailyChange = 40000 * 0.02 = 800
    expect(summary.dailyChange).toBeCloseTo(800);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- portfolio
```
Expected: all tests FAIL with "Cannot find module './portfolio'".

- [ ] **Step 3: Implement `src/lib/portfolio.ts`**

```ts
import type { Transaction, HoldingWithPnL, PortfolioSummary, PriceInfo } from "../types";

interface Lot { qty: number; price: number; }

function fifo(
  transactions: Transaction[],
  currentPrice: number,
  change24h: number,
): Omit<HoldingWithPnL, "asset_id" | "asset_symbol" | "asset_name" | "asset_type"> {
  const buys  = transactions.filter((t) => t.type === "buy") .sort((a, b) => a.transacted_at.localeCompare(b.transacted_at));
  const sells = transactions.filter((t) => t.type === "sell").sort((a, b) => a.transacted_at.localeCompare(b.transacted_at));

  const lots: Lot[] = buys.map((b) => ({ qty: b.quantity, price: b.price_per_unit }));
  let realizedPnL = 0;

  for (const sell of sells) {
    let remaining = sell.quantity;
    while (remaining > 0 && lots.length > 0) {
      const lot = lots[0];
      const consumed = Math.min(remaining, lot.qty);
      realizedPnL += (sell.price_per_unit - lot.price) * consumed;
      lot.qty -= consumed;
      remaining -= consumed;
      if (lot.qty <= 0) lots.shift();
    }
  }

  const quantity    = lots.reduce((s, l) => s + l.qty, 0);
  const totalCost   = lots.reduce((s, l) => s + l.qty * l.price, 0);
  const avgCost     = quantity > 0 ? totalCost / quantity : 0;
  const marketValue = quantity * currentPrice;
  const unrealizedPnL = marketValue - totalCost;
  const unrealizedPct = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;

  return { quantity, avgCost, currentPrice, marketValue, unrealizedPnL, unrealizedPct, realizedPnL, change24h, transactions };
}

/**
 * Derive current holdings with P&L from a flat list of transactions.
 * Holdings with quantity ≤ 0 are excluded (fully sold positions).
 */
export function deriveHoldings(
  transactions: Transaction[],
  priceMap: Record<string, PriceInfo>,
): HoldingWithPnL[] {
  const byAsset = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const bucket = byAsset.get(t.asset_id) ?? [];
    bucket.push(t);
    byAsset.set(t.asset_id, bucket);
  }

  const holdings: HoldingWithPnL[] = [];
  for (const [assetId, txns] of byAsset) {
    const { price = 0, change24h = 0 } = priceMap[assetId] ?? {};
    const pnl = fifo(txns, price, change24h);
    if (pnl.quantity <= 0) continue;
    const first = txns[0];
    holdings.push({
      asset_id:    first.asset_id,
      asset_symbol: first.asset_symbol,
      asset_name:  first.asset_name,
      asset_type:  first.asset_type,
      ...pnl,
    });
  }
  return holdings;
}

/** Aggregate portfolio-level totals from derived holdings. */
export function portfolioSummary(holdings: HoldingWithPnL[]): PortfolioSummary {
  const totalValue      = holdings.reduce((s, h) => s + h.marketValue, 0);
  const totalUnrealized = holdings.reduce((s, h) => s + h.unrealizedPnL, 0);
  const totalRealized   = holdings.reduce((s, h) => s + h.realizedPnL, 0);
  const dailyChange     = holdings.reduce((s, h) => s + h.marketValue * (h.change24h / 100), 0);
  const prevValue       = totalValue - dailyChange;
  const dailyChangePct  = prevValue > 0 ? (dailyChange / prevValue) * 100 : 0;
  return { totalValue, totalUnrealized, totalRealized, dailyChange, dailyChangePct };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- portfolio
```
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/portfolio.ts src/lib/portfolio.test.ts
git commit -m "feat: portfolio.ts — FIFO P&L logic (deriveHoldings, portfolioSummary) + Vitest tests"
```

---

## Task 11: `src/hooks/usePortfolio.ts`

**Files:**
- Create: `src/hooks/usePortfolio.ts`

**Interfaces produced (used by Task 12):**
```ts
export function usePortfolio(): {
  transactions: Transaction[];
  holdings: HoldingWithPnL[];
  summary: PortfolioSummary;
  isLive: boolean;
  loading: boolean;
  error: string | null;
  addTransaction(t: Omit<Transaction, "id"|"user_id"|"created_at">): Promise<{ error: string|null }>;
  deleteTransaction(id: string): Promise<void>;
}
```

- [ ] **Step 1: Create `src/hooks/usePortfolio.ts`**

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { getFMPStockList } from "../lib/fmp";
import { binanceSymbol, fetchTicker } from "../lib/binance";
import { deriveHoldings, portfolioSummary } from "../lib/portfolio";
import type { Transaction, HoldingWithPnL, PortfolioSummary, PriceInfo, AssetType } from "../types";

type NewTransaction = Omit<Transaction, "id" | "user_id" | "created_at">;

export function usePortfolio() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [priceMap,     setPriceMap]     = useState<Record<string, PriceInfo>>({});
  const [isLive,       setIsLive]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Load transactions from Supabase
  const load = useCallback(async () => {
    if (!supabase || !user) { setTransactions([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("portfolio_transactions")
      .select("*")
      .order("transacted_at", { ascending: false });
    if (err) setError(err.message);
    else setTransactions((data ?? []) as Transaction[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // Fetch live prices for held assets
  useEffect(() => {
    if (transactions.length === 0) return;

    const assetIds  = [...new Set(transactions.map((t) => t.asset_id))];
    const cryptoIds = transactions.filter((t) => t.asset_type === "crypto").map((t) => t.asset_symbol);
    const stockIds  = transactions.filter((t) => t.asset_type === "stock" ).map((t) => t.asset_id);

    let cancelled = false;

    async function fetchPrices() {
      const map: Record<string, PriceInfo> = {};

      // Crypto: Binance ticker for each symbol
      await Promise.allSettled(
        [...new Set(cryptoIds)].map(async (sym) => {
          const bnSym = binanceSymbol(sym);
          if (!bnSym) return;
          const ticker = await fetchTicker(bnSym);
          if (ticker && !cancelled) {
            // find the asset_id for this symbol
            const assetId = transactions.find((t) => t.asset_symbol === sym && t.asset_type === "crypto")?.asset_id ?? sym.toLowerCase();
            map[assetId] = { price: ticker.price, change24h: ticker.changePercent };
          }
        }),
      );

      // Stocks: FMP bulk quote
      if (stockIds.length > 0) {
        try {
          const { assets } = await getFMPStockList();
          for (const a of assets) {
            if (stockIds.includes(a.id)) {
              map[a.id] = { price: a.price, change24h: a.change24h };
            }
          }
        } catch { /* keep whatever prices we have */ }
      }

      if (!cancelled) {
        setPriceMap((prev) => ({ ...prev, ...map }));
        setIsLive(Object.keys(map).length > 0);
      }
    }

    void fetchPrices();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void fetchPrices(); }, 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [transactions]);

  const holdings: HoldingWithPnL[] = useMemo(
    () => deriveHoldings(transactions, priceMap),
    [transactions, priceMap],
  );

  const summary: PortfolioSummary = useMemo(
    () => portfolioSummary(holdings),
    [holdings],
  );

  const addTransaction = useCallback(
    async (t: NewTransaction): Promise<{ error: string | null }> => {
      if (!supabase || !user) return { error: "Sign in to manage your portfolio." };
      const { error: err } = await supabase.from("portfolio_transactions").insert({
        ...t,
        user_id: user.id,
      });
      if (err) return { error: err.message };
      await load();
      return { error: null };
    },
    [user, load],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!supabase) return;
      await supabase.from("portfolio_transactions").delete().eq("id", id);
      await load();
    },
    [load],
  );

  return { transactions, holdings, summary, isLive, loading, error, addTransaction, deleteTransaction };
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePortfolio.ts
git commit -m "feat: usePortfolio hook — Supabase CRUD + live price overlay + FIFO P&L"
```

---

## Task 12: Portfolio components — SummaryBar, AllocationChart, HoldingsTable

**Files:**
- Create: `src/components/portfolio/SummaryBar.tsx`
- Create: `src/components/portfolio/AllocationChart.tsx`
- Create: `src/components/portfolio/HoldingsTable.tsx`

- [ ] **Step 1: Create `src/components/portfolio/SummaryBar.tsx`**

```tsx
import { Radio } from "lucide-react";
import type { PortfolioSummary } from "../../types";
import { formatCompactUsd, formatPercent, formatPrice } from "../../lib/format";
import { changeDirection } from "../../lib/format";

interface Props { summary: PortfolioSummary; isLive: boolean; }

function StatPill({ label, value, pct, highlight }: { label: string; value: number; pct?: number; highlight?: boolean }) {
  const dir = changeDirection(value);
  const color = highlight ? (dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-ink") : "text-ink";
  return (
    <div className="card flex-1 min-w-[140px] p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={`mt-1 text-lg font-extrabold tabular-nums ${color}`}>
        {value >= 0 ? "+" : ""}{formatCompactUsd(value)}
      </p>
      {pct !== undefined && (
        <p className={`text-xs font-semibold tabular-nums ${dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-ink-muted"}`}>
          {formatPercent(pct)}
        </p>
      )}
    </div>
  );
}

export function SummaryBar({ summary, isLive }: Props) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Portfolio</h1>
        {isLive && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-up">
            <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" /> Live
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="card flex-1 min-w-[140px] p-4">
          <p className="text-xs text-ink-muted">Total Value</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums">{formatPrice(summary.totalValue)}</p>
        </div>
        <StatPill label="Unrealized P&L" value={summary.totalUnrealized} highlight />
        <StatPill label="Realized P&L"   value={summary.totalRealized}   highlight />
        <StatPill label="24h Change"      value={summary.dailyChange} pct={summary.dailyChangePct} highlight />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/portfolio/AllocationChart.tsx`**

```tsx
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { HoldingWithPnL } from "../../types";
import { formatCompactUsd } from "../../lib/format";

const COLORS = ["#6366F1","#22C55E","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316","#EC4899","#14B8A6","#84CC16"];

interface Props { holdings: HoldingWithPnL[]; }

export function AllocationChart({ holdings }: Props) {
  const data = holdings
    .filter((h) => h.marketValue > 0)
    .sort((a, b) => b.marketValue - a.marketValue)
    .map((h) => ({ name: h.asset_symbol, value: h.marketValue, fullName: h.asset_name }));

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) return null;

  return (
    <div className="card p-5 h-full">
      <h2 className="mb-3 text-sm font-semibold">Allocation</h2>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, _: string, p) => [
              `${formatCompactUsd(v)} (${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%)`,
              p.payload.fullName,
            ]}
            contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-ink-muted">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/portfolio/HoldingsTable.tsx`**

```tsx
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { HoldingWithPnL } from "../../types";
import { ChangeBadge } from "../ui/ChangeBadge";
import { AssetIcon } from "../ui/AssetIcon";
import { formatCompactUsd, formatPercent, formatPrice, changeDirection } from "../../lib/format";

interface Props { holdings: HoldingWithPnL[]; totalValue: number; }

export function HoldingsTable({ holdings, totalValue }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (holdings.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <h2 className="px-5 py-4 text-sm font-semibold border-b border-line">Holdings</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-muted">
              <th className="px-5 py-3 text-left font-medium">Asset</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Avg Cost</th>
              <th className="px-4 py-3 text-right font-medium">Current</th>
              <th className="px-4 py-3 text-right font-medium">Unrealized P&L</th>
              <th className="px-4 py-3 text-right font-medium">Portfolio %</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const isOpen = expanded === h.asset_id;
              const dir = changeDirection(h.unrealizedPnL);
              const pct = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
              const asset = { id: h.asset_id, symbol: h.asset_symbol, name: h.asset_name, type: h.asset_type, price: h.currentPrice, change24h: h.change24h };

              return (
                <>
                  <tr
                    key={h.asset_id}
                    className="border-b border-line/50 hover:bg-elevated/40 cursor-pointer transition-colors"
                    onClick={() => setExpanded(isOpen ? null : h.asset_id)}
                    aria-expanded={isOpen}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <AssetIcon asset={asset as any} size={28} />
                        <div>
                          <p className="font-semibold">{h.asset_symbol}</p>
                          <p className="text-xs text-ink-muted truncate max-w-[120px]">{h.asset_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{h.quantity.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPrice(h.avgCost)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPrice(h.currentPrice)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${dir === "up" ? "text-up" : dir === "down" ? "text-down" : ""}`}>
                      <p>{h.unrealizedPnL >= 0 ? "+" : ""}{formatCompactUsd(h.unrealizedPnL)}</p>
                      <p className="text-xs">{formatPercent(h.unrealizedPct)}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="tabular-nums">{pct.toFixed(1)}%</span>
                        <ChevronDown className={`h-3 w-3 text-ink-muted transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${h.asset_id}-expand`} className="bg-elevated/20">
                      <td colSpan={6} className="px-5 py-3">
                        <p className="mb-2 text-xs font-semibold text-ink-muted uppercase tracking-wide">Transactions</p>
                        <div className="space-y-1">
                          {h.transactions
                            .sort((a, b) => b.transacted_at.localeCompare(a.transacted_at))
                            .map((t) => (
                              <div key={t.id} className="flex items-center gap-3 text-xs">
                                <span className={`rounded px-2 py-0.5 font-bold ${t.type === "buy" ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
                                  {t.type.toUpperCase()}
                                </span>
                                <span className="tabular-nums">{t.quantity} @ {formatPrice(t.price_per_unit)}</span>
                                <span className="text-ink-muted">{t.transacted_at}</span>
                                {t.notes && <span className="text-ink-muted italic">{t.notes}</span>}
                              </div>
                            ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build check**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/portfolio/
git commit -m "feat: portfolio components — SummaryBar, AllocationChart, HoldingsTable"
```

---

## Task 13: AddTransactionModal + TransactionHistory components

**Files:**
- Create: `src/components/portfolio/AddTransactionModal.tsx`
- Create: `src/components/portfolio/TransactionHistory.tsx`

- [ ] **Step 1: Create `src/components/portfolio/AddTransactionModal.tsx`**

```tsx
import { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
import { getCryptoMarkets } from "../../lib/coingecko";
import { STOCK_UNIVERSE } from "../../lib/stockSeed";
import type { Transaction } from "../../types";

type NewTx = Omit<Transaction, "id" | "user_id" | "created_at">;

interface SearchResult { id: string; symbol: string; name: string; type: "crypto" | "stock"; image?: string; }

interface Props {
  onClose(): void;
  onSubmit(t: NewTx): Promise<{ error: string | null }>;
}

export function AddTransactionModal({ onClose, onSubmit }: Props) {
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState<SearchResult[]>([]);
  const [selected,   setSelected]   = useState<SearchResult | null>(null);
  const [txType,     setTxType]     = useState<"buy" | "sell">("buy");
  const [quantity,   setQuantity]   = useState("");
  const [price,      setPrice]      = useState("");
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced asset search
  useEffect(() => {
    clearTimeout(searchRef.current);
    if (!query.trim()) { setResults([]); return; }
    searchRef.current = setTimeout(async () => {
      const q = query.toLowerCase();
      // Stock matches (local, instant)
      const stockMatches: SearchResult[] = STOCK_UNIVERSE
        .filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
        .slice(0, 5)
        .map((s) => ({ id: s.symbol, symbol: s.symbol, name: s.name, type: "stock" }));
      // Crypto: use cached market list (already loaded elsewhere)
      let cryptoMatches: SearchResult[] = [];
      try {
        const coins = await getCryptoMarkets(50, 1, false);
        cryptoMatches = coins
          .filter((c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
          .slice(0, 5)
          .map((c) => ({ id: c.id, symbol: c.symbol, name: c.name, type: "crypto", image: c.image }));
      } catch { /* ignore */ }
      setResults([...cryptoMatches, ...stockMatches].slice(0, 8));
    }, 300);
    return () => clearTimeout(searchRef.current);
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setFormError("Select an asset."); return; }
    const qty  = parseFloat(quantity);
    const ppu  = parseFloat(price);
    if (isNaN(qty) || qty <= 0)  { setFormError("Enter a valid quantity."); return; }
    if (isNaN(ppu) || ppu < 0)   { setFormError("Enter a valid price."); return; }
    if (!date) { setFormError("Select a date."); return; }
    setSubmitting(true);
    setFormError(null);
    const { error } = await onSubmit({
      asset_id:      selected.id,
      asset_symbol:  selected.symbol,
      asset_name:    selected.name,
      asset_type:    selected.type,
      type:          txType,
      quantity:      qty,
      price_per_unit: ppu,
      transacted_at: date,
      notes:         notes.trim() || null,
    });
    setSubmitting(false);
    if (error) { setFormError(error); return; }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Add Transaction">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add Transaction</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-elevated"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          {/* Asset search */}
          {!selected ? (
            <div>
              <label className="mb-1 block text-xs text-ink-muted">Search asset</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Bitcoin, AAPL…"
                  className="w-full rounded-lg border border-line bg-elevated py-2.5 pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>
              {results.length > 0 && (
                <ul className="mt-1 rounded-lg border border-line bg-card shadow-xl">
                  {results.map((r) => (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        type="button"
                        onClick={() => { setSelected(r); setQuery(""); setResults([]); }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-elevated transition-colors"
                      >
                        {r.image && <img src={r.image} alt="" className="h-5 w-5 rounded-full" />}
                        <span className="font-semibold">{r.symbol}</span>
                        <span className="text-ink-muted truncate">{r.name}</span>
                        <span className={`ml-auto text-[10px] rounded px-1.5 py-0.5 ${r.type === "crypto" ? "bg-brand/20 text-brand" : "bg-elevated text-ink-muted"}`}>{r.type}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5">
              <div>
                <p className="font-semibold">{selected.symbol}</p>
                <p className="text-xs text-ink-muted">{selected.name}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-xs text-brand hover:underline">Change</button>
            </div>
          )}

          {/* Buy / Sell toggle */}
          <div>
            <label className="mb-1 block text-xs text-ink-muted">Type</label>
            <div className="flex rounded-lg border border-line bg-elevated p-1 gap-1">
              {(["buy", "sell"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTxType(t)}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold capitalize transition-colors ${
                    txType === t ? (t === "buy" ? "bg-up text-white" : "bg-down text-white") : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="qty" className="mb-1 block text-xs text-ink-muted">Quantity</label>
              <input id="qty" type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-line bg-elevated px-3 py-2.5 text-sm focus:border-brand focus:outline-none" placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="ppu" className="mb-1 block text-xs text-ink-muted">Price per unit</label>
              <input id="ppu" type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-line bg-elevated px-3 py-2.5 text-sm focus:border-brand focus:outline-none" placeholder="0.00" />
            </div>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="mb-1 block text-xs text-ink-muted">Date</label>
            <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-line bg-elevated px-3 py-2.5 text-sm focus:border-brand focus:outline-none" />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="mb-1 block text-xs text-ink-muted">Notes (optional)</label>
            <input id="notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-line bg-elevated px-3 py-2.5 text-sm focus:border-brand focus:outline-none" placeholder="e.g. DCA buy" />
          </div>

          {formError && <p className="text-xs text-down">{formError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] rounded-lg bg-brand py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Saving…" : `Add ${txType.charAt(0).toUpperCase() + txType.slice(1)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/portfolio/TransactionHistory.tsx`**

```tsx
import { Trash2 } from "lucide-react";
import type { Transaction } from "../../types";
import { formatPrice } from "../../lib/format";

interface Props {
  transactions: Transaction[];
  onDelete(id: string): Promise<void>;
}

export function TransactionHistory({ transactions, onDelete }: Props) {
  if (transactions.length === 0) return null;

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this transaction? P&L will be recalculated.")) return;
    await onDelete(id);
  };

  return (
    <div className="card mt-6 overflow-hidden">
      <h2 className="border-b border-line px-5 py-4 text-sm font-semibold">Transaction History</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-muted">
              <th className="px-5 py-3 text-left font-medium">Asset</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Notes</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-line/50 hover:bg-elevated/30 transition-colors">
                <td className="px-5 py-3 font-semibold">{t.asset_symbol}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${t.type === "buy" ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
                    {t.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{t.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPrice(t.price_per_unit)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPrice(t.quantity * t.price_per_unit)}</td>
                <td className="px-4 py-3 text-ink-muted">{t.transacted_at}</td>
                <td className="px-4 py-3 text-xs text-ink-muted italic">{t.notes ?? "—"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void handleDelete(t.id)}
                    aria-label="Delete transaction"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-ink-muted transition-colors hover:text-down"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/portfolio/
git commit -m "feat: portfolio — AddTransactionModal and TransactionHistory components"
```

---

## Task 14: Portfolio page + route

**Files:**
- Create: `src/pages/Portfolio.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/pages/Portfolio.tsx`**

```tsx
import { useState } from "react";
import { Plus } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { SummaryBar } from "../components/portfolio/SummaryBar";
import { AllocationChart } from "../components/portfolio/AllocationChart";
import { HoldingsTable } from "../components/portfolio/HoldingsTable";
import { AddTransactionModal } from "../components/portfolio/AddTransactionModal";
import { TransactionHistory } from "../components/portfolio/TransactionHistory";

export function Portfolio() {
  const { transactions, holdings, summary, isLive, loading, error, addTransaction, deleteTransaction } = usePortfolio();
  const [showModal, setShowModal] = useState(false);

  const isEmpty = !loading && transactions.length === 0;

  return (
    <div className="animate-fade-in">
      {/* Header with Add Transaction button */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1">
          <SummaryBar summary={summary} isLive={isLive} />
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 shrink-0 mt-8"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Transaction
        </button>
      </div>

      {loading && (
        <div className="card p-8 text-center text-sm text-ink-muted" role="status">
          Loading portfolio…
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-down/30 bg-down/10 px-4 py-3 text-sm text-down">
          {error}
        </div>
      )}

      {isEmpty ? (
        /* Empty state */
        <div className="card flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15">
            <Plus className="h-8 w-8 text-brand" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold">No transactions yet</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Add your first buy or sell to start tracking your portfolio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="min-h-[44px] rounded-lg bg-brand px-6 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity"
          >
            Add First Transaction
          </button>
        </div>
      ) : (
        <>
          {/* Bento: allocation + holdings */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <AllocationChart holdings={holdings} />
            </div>
            <div className="lg:col-span-2">
              <HoldingsTable holdings={holdings} totalValue={summary.totalValue} />
            </div>
          </div>

          {/* Transaction history */}
          <TransactionHistory transactions={transactions} onDelete={deleteTransaction} />
        </>
      )}

      {showModal && (
        <AddTransactionModal
          onClose={() => setShowModal(false)}
          onSubmit={addTransaction}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add `/portfolio` route to `src/App.tsx`**

Import:
```ts
import { Portfolio } from "./pages/Portfolio";
```

Add route inside `<Routes>`, after the `/watchlist` route:
```tsx
<Route
  path="/portfolio"
  element={
    <AuthGuard>
      <Portfolio />
    </AuthGuard>
  }
/>
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

- [ ] **Step 4: Run full test suite**

```bash
npm test
```
Expected: all tests pass (6 portfolio tests + existing tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Portfolio.tsx src/App.tsx
git commit -m "feat: Portfolio page — summary bar, allocation chart, holdings table, transaction modal, history + /portfolio route"
```

---

## Self-Review

**Spec coverage check:**
- ✅ IntervalPicker generalized with `intervals`/`storageKey`/`defaultPreferred` props (Task 1)
- ✅ `STOCK_INTERVALS` with `tdInterval` field (Task 1)
- ✅ `src/lib/twelvedata.ts` with caching + fallback (Task 2)
- ✅ FMP: analyst ratings, quarterly financials, news, sector performance, `calcStockPerformance` (Task 3)
- ✅ AssetDetail: stock chart uses IntervalPicker + Twelve Data (Task 4)
- ✅ AssetDetail: stock price performance section derived from OHLC (Task 5)
- ✅ AssetDetail: Analyst Ratings stacked bar (Task 5)
- ✅ AssetDetail: Financial Highlights bar charts + EPS grid (Task 5)
- ✅ AssetDetail: Company News feed (Task 5)
- ✅ Dashboard: Fear & Greed Index (Alternative.me, no key) (Task 6)
- ✅ Dashboard: Trending Coins (CoinGecko) (Task 7)
- ✅ Dashboard: Sector Performance (FMP) (Task 8)
- ✅ `supabase/schema.sql`: `portfolio_transactions` table + RLS (Task 9)
- ✅ Types: `Transaction`, `HoldingWithPnL`, `PortfolioSummary` (Task 9)
- ✅ `portfolio.ts`: FIFO `deriveHoldings` + `portfolioSummary` (Task 10)
- ✅ `portfolio.test.ts`: 6 tests covering buy-only, buy+sell, partial sell, oversell, zero-qty exclusion, summary (Task 10)
- ✅ `usePortfolio`: Supabase CRUD + live price polling (crypto Binance + stock FMP) (Task 11)
- ✅ Portfolio page: SummaryBar, AllocationChart, HoldingsTable (Task 12)
- ✅ Portfolio page: AddTransactionModal (asset search, buy/sell, qty/price/date/notes) (Task 13)
- ✅ Portfolio page: TransactionHistory with delete + confirmation (Task 13)
- ✅ `/portfolio` route (auth-gated) added to App.tsx (Task 14)
- ✅ `.env.example` updated with `VITE_TWELVE_DATA_KEY` (Task 2)

**Placeholder scan:** No TBDs or TODOs in any task. All code blocks are complete.

**Type consistency:**
- `Interval.tdInterval?: string` — defined Task 1, consumed Task 4 ✅
- `StockOHLCPoint` from `fmp.ts` — used in `twelvedata.ts` (imported) ✅
- `AnalystRatings`, `QuarterlyFinancial`, `StockNewsItem`, `SectorData`, `StockPerfStats` — defined Task 3, consumed Task 5 ✅
- `Transaction`, `HoldingWithPnL`, `PortfolioSummary`, `PriceInfo` — defined Task 9, consumed Tasks 10-14 ✅
- `deriveHoldings(transactions, priceMap)` — defined Task 10, consumed Task 11 ✅
- `portfolioSummary(holdings)` — defined Task 10, consumed Task 11 ✅
