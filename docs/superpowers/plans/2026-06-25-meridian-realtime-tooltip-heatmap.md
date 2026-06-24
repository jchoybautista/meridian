# Meridian Realtime + Candle Tooltip + Heatmap Restyle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Binance-style candle hover tooltip, make every page update in realtime without a refresh (crypto via WebSocket, stocks via visibility-gated polling), and restyle the heatmap for readability.

**Architecture:** Pure helpers (candle math, live-ticker overlay, FMP mapping) are unit-tested with Vitest. Realtime crypto rides one Binance combined ticker WebSocket; a `useLiveAssets` hook overlays live price/%-change onto CoinGecko snapshots at the page level, so existing child components update with no changes. Stocks poll through an extended `useAsync`. The tooltip and heatmap are reworked inside their existing chart components.

**Tech Stack:** React 19, TypeScript, Vite 8, lightweight-charts v5, Recharts 3, Tailwind v3, Vitest (new).

## Global Constraints

- **$0 cost forever** — no new paid APIs. Binance/CoinGecko/mempool need no key; FMP free = 250/day, Alpha Vantage free = 25/day.
- **Stock polling MUST pause when `document.visibilityState === "hidden"`** to protect the FMP daily budget.
- **WCAG 2.1 AA**, mobile-web responsive, cross-browser — preserve existing semantics, focus rings, and color-plus-icon indicators.
- **Graceful degradation** — every live path falls back to the existing snapshot/seed data when a socket or key is unavailable.
- **Heatmap text is always white** (`#F8FAFC`), legibility via drop-shadow, never a stroke/outline.
- Binance kline array indices: `k[0]` openTime ms, `k[1..4]` OHLC, `k[5]` base volume, `k[7]` quote volume. Live kline msg fields: `k.v` base volume, `k.q` quote volume.
- Commit after every task. Do **not** create the GitHub remote or push until Task 11.

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `package.json`, `vite.config.ts`, `tsconfig.app.json` | tooling | Add Vitest, `test` script, exclude tests from app build |
| `src/lib/coingecko.ts` | crypto data + `OHLCPoint` type | Add `volume?`, `quoteVolume?` |
| `src/lib/binance.ts` | Binance REST/WS | volume in klines + live WS; `openMultiTickerStream`; `overlayLiveTickers`; export `klineToPoint` |
| `src/lib/candle.ts` | **new** — candle math | `candleStats`, `formatCandleTime` |
| `src/lib/fmp.ts` | FMP stocks | `StockOHLCPoint.volume`; pure `mapFmpHistorical`; shorter bulk cache TTL |
| `src/hooks/useLiveTickers.ts` | **new** — multi-symbol live map | `useLiveTickers(symbols, enabled)` |
| `src/hooks/useLiveAssets.ts` | **new** — overlay hook | `useLiveAssets(assets)` → `{ assets, isLive }` |
| `src/hooks/useAsync.ts` | async + optional polling | Add `options.pollMs`, silent visibility-aware refresh |
| `src/components/charts/CandlestickChart.tsx` | candlestick + tooltip | Crosshair tooltip overlay |
| `src/components/charts/Heatmap.tsx` | treemap | Restyle + hover tooltip + live price |
| `src/components/ui/LiveDot.tsx` | **new** — live indicator | Pulsing "Live" dot |
| `src/pages/Dashboard.tsx` | dashboard | Overlay crypto, poll stocks, LiveDot |
| `src/pages/MarketsCrypto.tsx` | crypto table page | Overlay crypto + LiveDot |
| `src/pages/MarketsStocks.tsx` | stock table page | Poll stocks |
| `src/pages/AssetDetail.tsx` | detail page | Pass volume through; poll stock quote |

---

## Task 1: Vitest setup (unit-test infrastructure)

**Files:**
- Modify: `package.json` (scripts + devDependency)
- Modify: `vite.config.ts`
- Modify: `tsconfig.app.json:24` (`include`/add `exclude`)
- Test: `src/lib/smoke.test.ts` (temporary, deleted at end of task)

**Interfaces:**
- Produces: a working `npm test` (Vitest, node environment) that picks up `src/**/*.test.ts`.

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest@^3`
Expected: adds `vitest` to devDependencies, no peer-dep errors.

- [ ] **Step 2: Add the test script**

In `package.json`, add to `"scripts"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Configure Vitest (node env) in `vite.config.ts`**

Replace the file with:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Keep test files out of the production type-check**

In `tsconfig.app.json`, change the last line from `"include": ["src"]` to:

```json
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
```

- [ ] **Step 5: Write a smoke test**

Create `src/lib/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("vitest", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run it**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 7: Confirm the build still type-checks**

Run: `npm run build`
Expected: succeeds (test file excluded from app tsconfig).

- [ ] **Step 8: Delete the smoke test and commit**

```bash
rm src/lib/smoke.test.ts
git add package.json package-lock.json vite.config.ts tsconfig.app.json
git commit -m "chore: add Vitest for unit-testing pure functions"
```

---

## Task 2: Volume plumbing into Binance klines + live stream

**Files:**
- Modify: `src/lib/coingecko.ts:170-177` (`OHLCPoint`)
- Modify: `src/lib/binance.ts` (`klineToPoint`, `RawKlineMsg`, `openKlineStream`)
- Test: `src/lib/binance.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `OHLCPoint` now has optional `volume?: number` (base) and `quoteVolume?: number` (quote turnover).
  - `export function klineToPoint(k: RawKline): OHLCPoint` (newly exported) populating both volumes.
  - `openKlineStream` callback candle carries `volume`/`quoteVolume`.

- [ ] **Step 1: Extend the `OHLCPoint` type**

In `src/lib/coingecko.ts`, replace the `OHLCPoint` interface (lines 170-177) with:

```ts
/** One OHLC candle. `time` is unix seconds (required by lightweight-charts). */
export interface OHLCPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Base-asset volume for the candle (tooltip "Vol"). */
  volume?: number;
  /** Quote-asset turnover for the candle (tooltip "Txn"). */
  quoteVolume?: number;
}
```

- [ ] **Step 2: Write the failing test for `klineToPoint`**

Create `src/lib/binance.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { klineToPoint } from "./binance";

describe("klineToPoint", () => {
  it("maps a raw kline array including base and quote volume", () => {
    // [openTime, open, high, low, close, baseVol, closeTime, quoteVol, ...]
    const raw = [
      1_696_118_400_000, "114048.94", "126199.63", "102000.00", "109608.01",
      "720300.29", 1_698_796_799_999, "81900000000", 81_900_000, 0, 0, 0,
    ] as const;
    const p = klineToPoint(raw as unknown as Parameters<typeof klineToPoint>[0]);
    expect(p.time).toBe(1_696_118_400);
    expect(p.open).toBeCloseTo(114048.94);
    expect(p.close).toBeCloseTo(109608.01);
    expect(p.volume).toBeCloseTo(720300.29);
    expect(p.quoteVolume).toBeCloseTo(81_900_000_000);
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npm test -- binance`
Expected: FAIL — `klineToPoint` is not exported / `volume` undefined.

- [ ] **Step 4: Export `klineToPoint` and populate volumes**

In `src/lib/binance.ts`, change `function klineToPoint` (line 61) to be exported and read the volume fields:

```ts
export function klineToPoint(k: RawKline): OHLCPoint {
  return {
    time: Math.floor(k[0] / 1000), // openTime ms → unix seconds
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5] as string),
    quoteVolume: parseFloat(k[7] as string),
  };
}
```

The `RawKline` tuple type only declares the first five members plus `...unknown[]`, so `k[5]`/`k[7]` are `unknown` — the `as string` casts are required.

- [ ] **Step 5: Carry volume on the live candle stream**

In `src/lib/binance.ts`, update `RawKlineMsg` and the `onmessage` body of `openKlineStream`:

```ts
interface RawKlineMsg {
  k: {
    t: number; // open time ms
    o: string;
    h: string;
    l: string;
    c: string;
    v: string; // base volume
    q: string; // quote volume
    x: boolean; // is this candle closed?
  };
}
```

and inside `ws.onmessage`, replace the `onCandle({...})` call with:

```ts
        const { k } = JSON.parse(ev.data as string) as RawKlineMsg;
        onCandle(
          {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
            quoteVolume: parseFloat(k.q),
          },
          k.x,
        );
```

- [ ] **Step 6: Run the test**

Run: `npm test -- binance`
Expected: PASS.

- [ ] **Step 7: Type-check and commit**

```bash
npm run build
git add src/lib/coingecko.ts src/lib/binance.ts src/lib/binance.test.ts
git commit -m "feat: carry base + quote volume on Binance candles"
```

---

## Task 3: Candle stats helper (Chg / %Chg / Range + time format)

**Files:**
- Create: `src/lib/candle.ts`
- Test: `src/lib/candle.test.ts`

**Interfaces:**
- Consumes: `OHLCPoint` from `./coingecko`.
- Produces:
  - `candleStats(p: { open: number; high: number; low: number; close: number }): { chg: number; chgPercent: number; rangePercent: number }`
  - `formatCandleTime(timeSec: number, intraday: boolean): string`

- [ ] **Step 1: Write the failing test (verified against the Binance screenshot)**

Create `src/lib/candle.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { candleStats } from "./candle";

describe("candleStats", () => {
  it("matches the Binance reference candle", () => {
    const s = candleStats({
      open: 114048.94, high: 126199.63, low: 102000.0, close: 109608.01,
    });
    expect(s.chg).toBeCloseTo(-4440.93, 1);
    expect(s.chgPercent).toBeCloseTo(-3.89, 2);
    expect(s.rangePercent).toBeCloseTo(21.22, 2);
  });

  it("is zero-safe when open is 0", () => {
    const s = candleStats({ open: 0, high: 0, low: 0, close: 0 });
    expect(s.chgPercent).toBe(0);
    expect(s.rangePercent).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- candle`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/candle.ts`**

```ts
/** Derived per-candle statistics shown in the hover tooltip. */
export function candleStats(p: {
  open: number;
  high: number;
  low: number;
  close: number;
}): { chg: number; chgPercent: number; rangePercent: number } {
  const chg = p.close - p.open;
  const chgPercent = p.open ? (chg / p.open) * 100 : 0;
  const rangePercent = p.open ? ((p.high - p.low) / p.open) * 100 : 0;
  return { chg, chgPercent, rangePercent };
}

/** Tooltip time label: time-of-day for intraday intervals, date otherwise. */
export function formatCandleTime(timeSec: number, intraday: boolean): string {
  const d = new Date(timeSec * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  if (intraday) {
    return d.toLocaleString("en-US", {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    });
  }
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- candle`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/candle.ts src/lib/candle.test.ts
git commit -m "feat: candle stats helper (chg, %chg, range) + time format"
```

---

## Task 4: Candle hover tooltip in CandlestickChart

**Files:**
- Modify: `src/components/charts/CandlestickChart.tsx`

**Interfaces:**
- Consumes: `candleStats`, `formatCandleTime` from `../../lib/candle`; `OHLCPoint`; formatters from `../../lib/format`.
- Produces: a crosshair-following OHLC tooltip; no new exports.

No unit test (DOM/chart wiring); verified by build + manual hover.

- [ ] **Step 1: Add imports and a points-by-time ref**

At the top of `src/components/charts/CandlestickChart.tsx`, add imports:

```ts
import { candleStats, formatCandleTime } from "../../lib/candle";
import { formatPrice, formatNumber, formatCompactUsd, formatPercent } from "../../lib/format";
```

Inside the component, add a ref beside the existing refs:

```ts
  const tooltipRef = useRef<HTMLDivElement>(null);
  const pointsByTimeRef = useRef<Map<number, OHLCPoint>>(new Map());
```

- [ ] **Step 2: Populate the points map in the data + live effects**

In the historical-data effect (after `series.setData(candles);`), add:

```ts
    pointsByTimeRef.current = new Map(data.map((d) => [d.time, d]));
```

In the live-candle effect (after the `series.update({...})` call), add:

```ts
    pointsByTimeRef.current.set(liveCandle.time, liveCandle);
```

- [ ] **Step 3: Subscribe to crosshair movement in the chart-creation effect**

Inside the first `useEffect` (the one that calls `createChart`), after `seriesRef.current = series;`, add the handler and subscription:

```ts
    const renderTooltip = (param: import("lightweight-charts").MouseEventParams) => {
      const el = tooltipRef.current;
      const container = containerRef.current;
      if (!el || !container) return;
      const bar = param.seriesData.get(series) as
        | { open: number; high: number; low: number; close: number }
        | undefined;
      if (!param.point || param.time === undefined || !bar) {
        el.style.display = "none";
        return;
      }
      const extra = pointsByTimeRef.current.get(param.time as number);
      const { chg, chgPercent, rangePercent } = candleStats(bar);
      const up = chg >= 0;
      const dirClass = up ? "text-up" : "text-down";
      const rows: string[] = [
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">Time</span><span>${formatCandleTime(param.time as number, intraday)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">Open</span><span>${formatPrice(bar.open)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">High</span><span>${formatPrice(bar.high)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">Low</span><span>${formatPrice(bar.low)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">Close</span><span>${formatPrice(bar.close)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">Chg</span><span class="${dirClass}">${up ? "+" : ""}${formatNumber(chg)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">%Chg</span><span class="${dirClass}">${formatPercent(chgPercent)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">Range</span><span>${rangePercent.toFixed(2)}%</span></div>`,
      ];
      if (extra?.volume != null) {
        rows.push(`<div class="flex justify-between gap-6"><span class="text-ink-muted">Vol</span><span>${formatNumber(extra.volume)}</span></div>`);
      }
      if (extra?.quoteVolume != null) {
        rows.push(`<div class="flex justify-between gap-6"><span class="text-ink-muted">Txn</span><span>${formatCompactUsd(extra.quoteVolume).replace("$", "")}</span></div>`);
      }
      el.innerHTML = rows.join("");
      el.style.display = "block";

      const { clientWidth: cw, clientHeight: ch } = container;
      const tw = el.offsetWidth;
      const th = el.offsetHeight;
      let left = param.point.x + 16;
      if (left + tw > cw) left = param.point.x - tw - 16;
      left = Math.max(4, Math.min(left, cw - tw - 4));
      let top = param.point.y + 16;
      if (top + th > ch) top = Math.max(4, param.point.y - th - 16);
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    };
    chart.subscribeCrosshairMove(renderTooltip);
```

- [ ] **Step 4: Add `relative` to the container and render the tooltip element**

Replace the returned JSX with a wrapper that hosts the tooltip:

```tsx
  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[340px] w-full"
        role="img"
        aria-label="Candlestick price chart"
      />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-20 hidden min-w-[180px] rounded-lg border border-line bg-card/95 px-3 py-2 text-xs tabular-nums shadow-2xl backdrop-blur"
        style={{ display: "none" }}
        aria-hidden="true"
      />
    </div>
  );
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Manual verification**

Run `npm run dev`, open a crypto asset detail page (e.g. Bitcoin), hover across the candles. Expected: a panel follows the crosshair showing Time/Open/High/Low/Close/Chg/%Chg/Range/Vol/Txn, with Chg/%Chg colored red/green, and it flips side near the right/bottom edges. Moving off the chart hides it.

- [ ] **Step 7: Commit**

```bash
git add src/components/charts/CandlestickChart.tsx
git commit -m "feat: Binance-style OHLC hover tooltip on candlestick chart"
```

---

## Task 5: FMP stock volume → tooltip on stock charts

**Files:**
- Modify: `src/lib/fmp.ts` (`StockOHLCPoint`, new `mapFmpHistorical`, `getStockOHLC`, `CACHE_TTL`)
- Modify: `src/pages/AssetDetail.tsx:284-288` (pass volume through)
- Test: `src/lib/fmp.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `StockOHLCPoint` gains `volume?: number`.
  - `export function mapFmpHistorical(hist: FMPHistorical[]): StockOHLCPoint[]` (pure, sorted ascending, NaN-time filtered, includes volume).

- [ ] **Step 1: Write the failing test**

Create `src/lib/fmp.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mapFmpHistorical } from "./fmp";

describe("mapFmpHistorical", () => {
  it("maps + sorts ascending and keeps volume", () => {
    const out = mapFmpHistorical([
      { date: "2026-01-02", open: 2, high: 3, low: 1, close: 2.5, volume: 200 },
      { date: "2026-01-01", open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
    ]);
    expect(out.map((d) => d.close)).toEqual([1.5, 2.5]);
    expect(out[0].volume).toBe(100);
    expect(out[1].time).toBeGreaterThan(out[0].time);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- fmp`
Expected: FAIL — `mapFmpHistorical` not exported; `FMPHistorical` has no `volume`.

- [ ] **Step 3: Add `volume` to the types and extract the pure mapper**

In `src/lib/fmp.ts`, add `volume?: number;` to `StockOHLCPoint` (after `close`), add `volume?: number;` to the `FMPHistorical` interface, and add an exported mapper above `getStockOHLC`:

```ts
export function mapFmpHistorical(hist: FMPHistorical[]): StockOHLCPoint[] {
  return hist
    .map((h) => ({
      time: Math.floor(new Date(h.date).getTime() / 1000),
      open: h.open,
      high: h.high,
      low: h.low,
      close: h.close,
      volume: h.volume,
    }))
    .filter((d) => !Number.isNaN(d.time))
    .sort((a, b) => a.time - b.time);
}
```

- [ ] **Step 4: Use the mapper in `getStockOHLC`**

In `getStockOHLC`, replace the inline `.map(...).filter(...).sort(...)` chain (the block that builds `data`) with:

```ts
    const data: StockOHLCPoint[] = mapFmpHistorical(hist);
```

- [ ] **Step 5: Shorten the bulk-quote cache so stock polling actually refreshes**

In `src/lib/fmp.ts`, change the bulk `CACHE_TTL` (line 24) from `3 * 60 * 1000` to:

```ts
const CACHE_TTL = 45 * 1000; // 45s — short enough for visibility-gated polling
```

- [ ] **Step 6: Pass volume through on the stock candlestick**

In `src/pages/AssetDetail.tsx`, the stock candlestick currently maps candles to a bare object (around line 285-288). Replace:

```tsx
                <CandlestickChart
                  data={stockCandles.map((c) => ({ ...c }))}
                  trend={trend}
                />
```

with (spread already carries `volume`; no Txn for stocks):

```tsx
                <CandlestickChart
                  data={stockCandles}
                  trend={trend}
                />
```

- [ ] **Step 7: Run the test + type-check**

Run: `npm test -- fmp`
Expected: PASS.
Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/lib/fmp.ts src/lib/fmp.test.ts src/pages/AssetDetail.tsx
git commit -m "feat: stock candle volume in tooltip; shorten FMP cache for polling"
```

---

## Task 6: `overlayLiveTickers` pure overlay

**Files:**
- Modify: `src/lib/binance.ts` (add `overlayLiveTickers`)
- Test: `src/lib/binance.test.ts` (extend)

**Interfaces:**
- Consumes: `Asset` from `../types`; `LiveTicker`, `binanceSymbol` (existing).
- Produces: `export function overlayLiveTickers(assets: Asset[], live: Map<string, LiveTicker>): Asset[]`.

- [ ] **Step 1: Add the failing test**

Append to `src/lib/binance.test.ts`:

```ts
import { overlayLiveTickers, type LiveTicker } from "./binance";
import type { Asset } from "../types";

const baseAsset = (over: Partial<Asset>): Asset => ({
  id: "x", symbol: "BTC", name: "Bitcoin", type: "crypto",
  price: 100, change24h: 1, ...over,
});

describe("overlayLiveTickers", () => {
  const live = new Map<string, LiveTicker>([
    ["BTC", { price: 200, changePercent: -3, high24h: 210, low24h: 190, volume24h: 5 }],
  ]);

  it("overrides price + change for a live symbol", () => {
    const [a] = overlayLiveTickers([baseAsset({})], live);
    expect(a.price).toBe(200);
    expect(a.change24h).toBe(-3);
    expect(a.high24h).toBe(210);
  });

  it("passes through symbols with no live tick", () => {
    const [a] = overlayLiveTickers([baseAsset({ symbol: "DOGE", price: 1 })], live);
    expect(a.price).toBe(1);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test -- binance`
Expected: FAIL — `overlayLiveTickers` not exported.

- [ ] **Step 3: Implement `overlayLiveTickers`**

Add to `src/lib/binance.ts` (it needs the `Asset` type — add `import type { Asset } from "../types";` at the top):

```ts
/**
 * Return a new asset list with live price/24h-change (and high/low/volume when
 * present) overlaid from a symbol→ticker map. Assets without a live tick — and
 * those not on Binance — pass through unchanged. Pure; safe to memoize.
 */
export function overlayLiveTickers(
  assets: Asset[],
  live: Map<string, LiveTicker>,
): Asset[] {
  if (live.size === 0) return assets;
  return assets.map((a) => {
    const t = live.get(a.symbol.toUpperCase());
    if (!t) return a;
    return {
      ...a,
      price: t.price,
      change24h: t.changePercent,
      high24h: t.high24h ?? a.high24h,
      low24h: t.low24h ?? a.low24h,
      volume24h: t.volume24h ?? a.volume24h,
    };
  });
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- binance`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/binance.ts src/lib/binance.test.ts
git commit -m "feat: overlayLiveTickers — merge live ticks onto asset snapshots"
```

---

## Task 7: Combined ticker stream + live hooks

**Files:**
- Modify: `src/lib/binance.ts` (add `openMultiTickerStream`)
- Create: `src/hooks/useLiveTickers.ts`
- Create: `src/hooks/useLiveAssets.ts`

**Interfaces:**
- Consumes: `parseTicker`, `fetchTicker`, `binanceSymbol`, `LiveTicker`, `overlayLiveTickers`.
- Produces:
  - `export function openMultiTickerStream(symbols: string[], onTick: (bySymbol: Map<string, LiveTicker>) => void): () => void`
  - `useLiveTickers(symbols: string[], enabled?: boolean): Map<string, LiveTicker>`
  - `useLiveAssets(assets: Asset[], enabled?: boolean): { assets: Asset[]; isLive: boolean }`

No unit test (WS/hooks); verified by build + manual.

- [ ] **Step 1: Implement `openMultiTickerStream`**

Add to `src/lib/binance.ts`. Note the combined-stream base path is `/stream?streams=` (not `/ws`). Updates are coalesced and flushed at most once per second to bound re-renders:

```ts
const STREAM = "wss://data-stream.binance.vision/stream";

/**
 * One WebSocket carrying live 24h tickers for many symbols. `onTick` receives a
 * symbol→ticker map at most once per second (coalesced). Falls back to batched
 * REST polling if the socket can't stay open. Returns a cleanup function.
 */
export function openMultiTickerStream(
  symbols: string[],
  onTick: (bySymbol: Map<string, LiveTicker>) => void,
): () => void {
  // our symbol ↔ binance pair (lowercase), skipping coins not on Binance
  const pairToSymbol = new Map<string, string>();
  for (const s of symbols) {
    const pair = binanceSymbol(s);
    if (pair) pairToSymbol.set(pair.toLowerCase(), s.toUpperCase());
  }
  if (pairToSymbol.size === 0) return () => {};

  const latest = new Map<string, LiveTicker>();
  let dirty = false;
  let ws: WebSocket | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let closed = false;

  const flushTimer = setInterval(() => {
    if (dirty) {
      dirty = false;
      onTick(new Map(latest));
    }
  }, 1000);

  const pairs = [...pairToSymbol.keys()];

  const startPolling = () => {
    if (pollTimer) return;
    const poll = () => {
      void Promise.all(
        [...pairToSymbol.values()].map(async (sym) => {
          const t = await fetchTicker(sym);
          if (t) { latest.set(sym, t); dirty = true; }
        }),
      );
    };
    poll();
    pollTimer = setInterval(poll, 5000);
  };
  const stopPolling = () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  };

  const connect = () => {
    if (closed) return;
    const url = `${STREAM}?streams=${pairs.map((p) => `${p}@ticker`).join("/")}`;
    try {
      ws = new WebSocket(url);
    } catch {
      startPolling();
      return;
    }
    ws.onopen = () => { failures = 0; stopPolling(); };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as { stream?: string; data?: RawTicker };
        if (!msg.stream || !msg.data) return;
        const pair = msg.stream.replace("@ticker", "");
        const sym = pairToSymbol.get(pair);
        if (!sym) return;
        latest.set(sym, parseTicker(msg.data));
        dirty = true;
      } catch { /* ignore malformed frame */ }
    };
    ws.onerror = () => ws?.close();
    ws.onclose = () => {
      if (closed) return;
      failures += 1;
      if (failures >= 3) startPolling();
      reconnectTimer = setTimeout(connect, Math.min(1000 * failures, 10000));
    };
  };

  connect();

  return () => {
    closed = true;
    clearInterval(flushTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    stopPolling();
    if (ws) { ws.onclose = null; ws.close(); }
  };
}
```

- [ ] **Step 2: Implement `useLiveTickers`**

Create `src/hooks/useLiveTickers.ts`:

```ts
import { useEffect, useRef, useState } from "react";
import { openMultiTickerStream, type LiveTicker } from "../lib/binance";

/**
 * Live 24h tickers for a set of symbols via one Binance combined WebSocket.
 * Returns a symbol→ticker map that updates at most once per second.
 */
export function useLiveTickers(symbols: string[], enabled = true): Map<string, LiveTicker> {
  const [tickers, setTickers] = useState<Map<string, LiveTicker>>(new Map());
  // Stable key so the effect only re-subscribes when the symbol set changes.
  const key = symbols.map((s) => s.toUpperCase()).sort().join(",");
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  useEffect(() => {
    if (!enabled || key === "") { setTickers(new Map()); return; }
    return openMultiTickerStream(symbolsRef.current, setTickers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return tickers;
}
```

- [ ] **Step 3: Implement `useLiveAssets`**

Create `src/hooks/useLiveAssets.ts`:

```ts
import { useMemo } from "react";
import { overlayLiveTickers } from "../lib/binance";
import { useLiveTickers } from "./useLiveTickers";
import type { Asset } from "../types";

/**
 * Overlay live Binance ticks onto a crypto asset list. Returns the live-merged
 * assets plus `isLive` (true once any tick has arrived) for a "Live" indicator.
 */
export function useLiveAssets(
  assets: Asset[],
  enabled = true,
): { assets: Asset[]; isLive: boolean } {
  const symbols = useMemo(() => assets.map((a) => a.symbol), [assets]);
  const live = useLiveTickers(symbols, enabled);
  const merged = useMemo(() => overlayLiveTickers(assets, live), [assets, live]);
  return { assets: merged, isLive: live.size > 0 };
}
```

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/binance.ts src/hooks/useLiveTickers.ts src/hooks/useLiveAssets.ts
git commit -m "feat: combined Binance ticker stream + live asset hooks"
```

---

## Task 8: Wire crypto realtime into Dashboard + Markets, add Live indicator

**Files:**
- Create: `src/components/ui/LiveDot.tsx`
- Modify: `src/pages/Dashboard.tsx` (CryptoBoard)
- Modify: `src/pages/MarketsCrypto.tsx`

**Interfaces:**
- Consumes: `useLiveAssets`.
- Produces: `LiveDot` component (`{ label?: string }`).

No unit test; verified by build + manual.

- [ ] **Step 1: Create the LiveDot indicator**

Create `src/components/ui/LiveDot.tsx`:

```tsx
import { Radio } from "lucide-react";

/** Small pulsing "Live" indicator shown when a realtime stream is connected. */
export function LiveDot({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-up" role="status">
      <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" />
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Overlay live data in the Dashboard CryptoBoard**

In `src/pages/Dashboard.tsx`, add imports:

```ts
import { useLiveAssets } from "../hooks/useLiveAssets";
import { LiveDot } from "../components/ui/LiveDot";
```

In `CryptoBoard`, replace `const assets = markets.data ?? [];` with a live overlay:

```ts
  const snapshot = markets.data ?? [];
  const { assets, isLive } = useLiveAssets(snapshot);
```

(The existing `btc`/`eth`/`dominance` derivations below now read from the live `assets` automatically.)

- [ ] **Step 3: Surface the Live indicator on the dashboard market-cap bar**

In `CryptoBoard`, inside the `global.data && (<dl ...>)` block, add a cell (or place beside the 24h cell):

```tsx
          {isLive && (
            <div className="self-center">
              <LiveDot />
            </div>
          )}
```

- [ ] **Step 4: Overlay live data in MarketsCrypto**

Replace `src/pages/MarketsCrypto.tsx` with:

```tsx
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
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Manual verification**

`npm run dev`: on the Dashboard (Crypto tab) and the Crypto Markets page, prices and 24h % update on their own (~1/sec) with no refresh, and a "Live" dot appears. The heatmap tiles reprice too (restyle comes next).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/LiveDot.tsx src/pages/Dashboard.tsx src/pages/MarketsCrypto.tsx
git commit -m "feat: realtime crypto on dashboard + markets with Live indicator"
```

---

## Task 9: Visibility-aware polling for stocks

**Files:**
- Modify: `src/hooks/useAsync.ts` (add `options.pollMs`)
- Modify: `src/pages/Dashboard.tsx` (stocks), `src/pages/MarketsStocks.tsx`, `src/pages/AssetDetail.tsx` (stock quote)

**Interfaces:**
- Consumes: nothing new.
- Produces: `useAsync<T>(fn, deps, options?: { pollMs?: number })` — when `pollMs` is set, silently refetches every `pollMs` while the tab is visible (no loading flash), and refetches on tab re-show.

No unit test (hook); verified by build + manual.

- [ ] **Step 1: Extend `useAsync` with silent, visibility-aware polling**

Replace `src/hooks/useAsync.ts` with:

```ts
import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface AsyncOptions {
  /** When set, silently refetch on this interval while the tab is visible. */
  pollMs?: number;
}

/**
 * Runs an async function on mount and whenever `deps` change, tracking
 * loading/error state and exposing a manual `reload`. With `options.pollMs`,
 * it also refetches in the background (no loading flash) while the document is
 * visible, and immediately when the tab becomes visible again.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  options: AsyncOptions = {},
): AsyncState<T> {
  const { pollMs } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  // Keep the latest fn without forcing the polling effect to re-subscribe.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fnRef.current()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  useEffect(() => {
    if (!pollMs) return;
    let cancelled = false;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      fnRef.current()
        .then((result) => { if (!cancelled) setData(result); })
        .catch(() => { /* keep showing last good data on a failed poll */ });
    };
    const timer = setInterval(refresh, pollMs);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, ...deps]);

  return { data, loading, error, reload };
}
```

- [ ] **Step 2: Poll stocks on the Dashboard**

In `src/pages/Dashboard.tsx`, change the stocks fetch:

```ts
  const stocks = useAsync(() => getStockList(), [], { pollMs: 60_000 });
```

- [ ] **Step 3: Poll stocks on MarketsStocks**

In `src/pages/MarketsStocks.tsx`, change:

```ts
  const { data, loading, error, reload } = useAsync(() => getStockList(), [], { pollMs: 60_000 });
```

- [ ] **Step 4: Poll the stock quote on AssetDetail**

In `src/pages/AssetDetail.tsx`, add `{ pollMs: 60_000 }` to the `detail` `useAsync` **only for stocks**. Since `detail` serves both types, gate by passing `undefined` for crypto (crypto is already live via the ticker WS):

```ts
  const detail = useAsync<{ asset: Asset; sample: boolean }>(async () => {
    if (!id) throw new Error("Missing asset id.");
    if (isCrypto) return { asset: await getCryptoDetail(id), sample: false };
    return getStockQuote(id);
  }, [type, id], { pollMs: isCrypto ? undefined : 60_000 });
```

- [ ] **Step 5: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 6: Manual verification**

`npm run dev` with a `VITE_FMP_KEY` set: on the Stocks tab / Stock Markets, quotes refresh about once a minute without a full reload and without a skeleton flash. Switch away to another browser tab for a while → polling pauses; return → it refetches immediately. (Without a key, stocks stay on sample data — no errors.)

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useAsync.ts src/pages/Dashboard.tsx src/pages/MarketsStocks.tsx src/pages/AssetDetail.tsx
git commit -m "feat: visibility-gated polling for near-realtime stocks"
```

---

## Task 10: Heatmap restyle

**Files:**
- Modify: `src/components/charts/Heatmap.tsx`

**Interfaces:**
- Consumes: `Asset`, `formatPercent`, `formatPrice`.
- Produces: restyled treemap; no new exports.

No unit test; verified by build + manual.

- [ ] **Step 1: Replace `src/components/charts/Heatmap.tsx`**

White text always, no black outline (thin inset gap instead), deeper color ramp, live price on big tiles, and a hover tooltip. Click-to-navigate is preserved.

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, Treemap } from "recharts";
import type { Asset } from "../../types";
import { formatPercent, formatPrice } from "../../lib/format";

interface Props {
  assets: Asset[];
}

interface Node {
  id: string;
  name: string;
  size: number;
  change: number;
  price: number;
  [key: string]: string | number;
}

/** Deep red→green ramp by 24h change; tuned dark enough for white text. */
function tileColor(change: number): string {
  if (change >= 5) return "#15803D";
  if (change >= 2) return "#166534";
  if (change > 0) return "#15643C";
  if (change === 0) return "#374151";
  if (change > -2) return "#7F1D1D";
  if (change > -5) return "#991B1B";
  return "#B91C1C";
}

interface HoverInfo {
  name: string;
  price: number;
  change: number;
  marketCap: number;
  x: number;
  y: number;
}

/** Market-cap treemap: tile size = market cap, colour = 24h change. */
export function Heatmap({ assets }: Props) {
  const navigate = useNavigate();
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const data: Node[] = assets
    .filter((a) => a.marketCap)
    .slice(0, 18)
    .map((a) => ({
      id: a.id,
      name: a.symbol,
      size: a.marketCap ?? 0,
      change: a.change24h,
      price: a.price,
      marketCap: a.marketCap ?? 0,
    }));

  return (
    <div className="relative h-full min-h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          stroke="none"
          isAnimationActive={false}
          content={
            <TreeCell
              onSelect={(id) => navigate(`/asset/crypto/${id}`)}
              onHover={setHover}
            />
          }
        />
      </ResponsiveContainer>

      {hover && (
        <div
          className="pointer-events-none absolute z-20 min-w-[150px] rounded-lg border border-line bg-card/95 px-3 py-2 text-xs shadow-2xl backdrop-blur"
          style={{
            left: `min(${hover.x}px, calc(100% - 160px))`,
            top: Math.max(4, hover.y - 70),
          }}
          role="status"
        >
          <p className="font-bold">{hover.name}</p>
          <p className="tabular-nums">{formatPrice(hover.price)}</p>
          <p className={`tabular-nums ${hover.change >= 0 ? "text-up" : "text-down"}`}>
            {formatPercent(hover.change)}
          </p>
          <p className="text-ink-muted tabular-nums">
            Mkt Cap {formatPrice(hover.marketCap).replace(/\.\d+/, "")}
          </p>
        </div>
      )}
    </div>
  );
}

interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  change?: number;
  price?: number;
  marketCap?: number;
  id?: string;
  onSelect: (id: string) => void;
  onHover: (info: HoverInfo | null) => void;
}

function TreeCell({
  x = 0, y = 0, width = 0, height = 0,
  name, change = 0, price = 0, marketCap = 0, id, onSelect, onHover,
}: CellProps) {
  const showText = width > 40 && height > 24;
  const showPrice = width > 96 && height > 56;
  const bg = tileColor(change);
  return (
    <g
      onClick={() => id && onSelect(id)}
      onMouseEnter={() => name && onHover({ name, price, change, marketCap, x: x + width / 2, y })}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: id ? "pointer" : "default" }}
    >
      {/* inset rect → thin gap between tiles instead of a heavy black border */}
      <rect x={x + 1} y={y + 1} width={Math.max(0, width - 2)} height={Math.max(0, height - 2)} fill={bg} rx={5} />
      {showText && (
        <>
          <text
            x={x + 8} y={y + 18} fill="#F8FAFC" fontSize={13} fontWeight={700}
            style={{ textShadow: "0 1px 2px rgba(0,0,0,.45)" }}
          >
            {name}
          </text>
          <text
            x={x + 8} y={y + 34} fill="#F8FAFC" fontSize={11} fontWeight={600}
            style={{ textShadow: "0 1px 2px rgba(0,0,0,.45)" }}
          >
            {formatPercent(change)}
          </text>
          {showPrice && (
            <text
              x={x + 8} y={y + 51} fill="#F8FAFC" fillOpacity={0.85} fontSize={11}
              style={{ textShadow: "0 1px 2px rgba(0,0,0,.45)" }}
            >
              {formatPrice(price)}
            </text>
          )}
        </>
      )}
    </g>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Manual verification**

`npm run dev`, Dashboard → Heatmap: text is white on every tile (no black outlines), readable on the smallest tiles; large tiles show symbol + % + price; hovering a tile shows a tooltip and the cell is clickable; tiles recolor live.

- [ ] **Step 4: Commit**

```bash
git add src/components/charts/Heatmap.tsx
git commit -m "feat: restyle heatmap — white text, no outlines, live price, hover"
```

---

## Task 11: Full verification & ship to GitHub

**Files:** none (verification + release)

- [ ] **Step 1: Run the unit tests**

Run: `npm test`
Expected: all suites pass (binance, candle, fmp).

- [ ] **Step 2: Type-check / production build**

Run: `npm run build`
Expected: succeeds, no TS errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: clean (or only pre-existing warnings).

- [ ] **Step 4: Manual smoke pass (`npm run dev`)**

Verify, in one session:
- Crypto detail: hover tooltip matches the Binance field set (incl. Vol/Txn); price + candle tick live.
- Dashboard (crypto) + Crypto Markets: prices update without refresh; "Live" dot shows; heatmap readable + live.
- Stocks (with FMP key): quotes refresh ~once/min; pausing on hidden tab works.
- Mobile width (DevTools): tooltip and heatmap remain usable; bottom nav intact.

- [ ] **Step 5: Update the README roadmap note**

In `README.md`, move the realtime/tooltip/heatmap items from "Roadmap" into the feature list as shipped (brief edit; keep it honest about stocks being polled).

```bash
git add README.md
git commit -m "docs: note realtime, candle tooltip, heatmap in README"
```

- [ ] **Step 6: Create the GitHub repo and push** (the user's original request)

This is an outward-facing action — confirm the repo name/visibility with the user, then:

```bash
gh repo create meridian --source=. --private --remote=origin --push
```

Expected: repo created, `main` pushed. Confirm the remote URL is returned, then share it with the user.

---

## Self-Review

**Spec coverage:**
- Tooltip full parity (crypto) → Tasks 2, 3, 4. Stock tooltip (minus Txn) → Task 5. ✓
- Derived Chg/%Chg/Range verified against screenshot → Task 3 test. ✓
- Crypto realtime via combined stream + overlay → Tasks 6, 7, 8. ✓
- Stock polling, visibility-gated → Task 9. ✓
- Live indicator → Task 8 (LiveDot). ✓
- Heatmap restyle (white text, no outline, ramp, hover, live price) → Task 10. ✓
- $0 cost / FMP budget / WCAG / graceful degradation → Global Constraints, enforced in Tasks 7, 9. ✓
- Unit tests for pure functions → Tasks 2, 3, 5, 6 (klineToPoint, candleStats, mapFmpHistorical, overlayLiveTickers). ✓
- Build + push last → Task 11. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. ✓

**Type consistency:** `OHLCPoint.volume/quoteVolume`, `LiveTicker` fields, `overlayLiveTickers(assets, live)`, `useLiveAssets → { assets, isLive }`, `useAsync(fn, deps, options)` are used consistently across tasks. `klineToPoint`/`mapFmpHistorical`/`candleStats` signatures match their call sites. ✓
