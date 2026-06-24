# Meridian — Realtime Data, Candle Hover Tooltip & Heatmap Restyle

**Date:** 2026-06-25
**Status:** Approved design, pending implementation plan

## Goal

Make Meridian feel like a live trading site:

1. **Candle hover tooltip** — a Binance-style OHLC popup that follows the crosshair on the candlestick chart, for crypto (full parity) and stocks (parity minus trade turnover).
2. **Realtime on every page** — Dashboard and Markets lists update live without a page refresh, matching the behavior the asset-detail page already has.
3. **Heatmap restyle** — keep the market-cap-weighted treemap but fix readability: all-white text, no black outlines, refined color ramp, hover state.

These ship before the project is pushed to GitHub.

## Non-Goals

- Paid data feeds. Everything stays on the free tiers already in use (Binance public data, CoinGecko, FMP, Alpha Vantage, mempool.space).
- True streaming for stocks (FMP's WebSocket is paid) — stocks use polling.
- The portfolio simulation page (still gated behind explicit user approval).

---

## Feature 1 — Candle Hover Tooltip (full Binance parity)

### Behavior

Hovering (or moving the crosshair across) the candlestick chart shows a floating panel with the hovered candle's data. For crypto it matches the Binance reference exactly:

```
Time   10-01 08:00
Open   114,048.94
High   126,199.63
Low    102,000.00
Close  109,608.01
Chg     -4,440.92
%Chg    -3.89%
Range   21.22%
Vol     720,300.29
Txn     81.90B
```

For stocks: same set **minus Txn** (FMP daily history has no quote-volume / trade-count field). When the chart is the area-chart fallback (no FMP key), there is no tooltip because there are no candles.

### Data model

`OHLCPoint` (in `lib/coingecko.ts`) gains two optional fields:

```ts
export interface OHLCPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;       // base-asset volume → tooltip "Vol"
  quoteVolume?: number;  // quote-asset turnover → tooltip "Txn"
}
```

`StockOHLCPoint` (in `lib/fmp.ts`) gains `volume?: number` only (no `quoteVolume`).

### Sourcing the new fields

- **Binance klines** (`klineToPoint`): `volume = parseFloat(k[5])`, `quoteVolume = parseFloat(k[7])`.
- **Binance live kline WS** (`openKlineStream`): `volume = parseFloat(k.v)`, `quoteVolume = parseFloat(k.q)`.
- **FMP historical** (`getStockOHLC`): parse the existing `volume` field into `StockOHLCPoint.volume`.

Field mapping verified against the screenshot: Vol 720,300.29 BTC × ~113k ≈ 81.9B USDT = Txn, confirming Vol = base volume (`k[5]`) and Txn = quote volume (`k[7]`).

### Derived fields (computed in the tooltip, not stored)

- `Chg = close − open`
- `%Chg = (close − open) / open × 100`
- `Range = (high − low) / open × 100`

These reproduce the screenshot's −4,440.92 / −3.89% / 21.22% exactly.

### Rendering

Lives entirely inside `components/charts/CandlestickChart.tsx`, which already owns the chart instance.

- Subscribe via `chart.subscribeCrosshairMove(param)`.
  - `param.time` absent (crosshair off the data) → hide the tooltip.
  - `param.seriesData.get(series)` → the OHLC for the hovered bar.
  - `param.point` → pixel coords for positioning.
- An absolutely-positioned HTML `<div>` overlay inside the (now `position: relative`) container. It edge-flips: if the crosshair is in the right half, render the panel to the left of the cursor, and vice-versa, so it never clips the container.
- A `Map<time, OHLCPoint>` built in the data effect (and kept in sync on live updates) supplies `volume`/`quoteVolume`, which the crosshair event itself does not carry.
- Rows render conditionally: `Txn` only when `quoteVolume` is present, `Vol` only when `volume` is present — so the same component serves crypto and stocks.
- Number formatting reuses `lib/format.ts` (`formatPrice`, `formatNumber`, `formatCompactUsd`, `formatPercent`); the date/time line respects the chart's `intraday` flag (time-of-day for intraday intervals, date for daily+).

### Accessibility

The tooltip is pointer/crosshair-driven and decorative; the chart keeps its existing `role="img"` + `aria-label`. No keyboard trap, no focus change. Touch devices fall back to the existing tap-to-crosshair behavior of lightweight-charts.

---

## Feature 2 — Realtime on Every Page

### Crypto — true realtime (WebSocket)

**New stream primitive** in `lib/binance.ts`:

```ts
export function openMultiTickerStream(
  symbols: string[],
  onTick: (bySymbol: Map<string, LiveTicker>) => void,
): () => void
```

- Opens a single Binance **combined** stream:
  `wss://data-stream.binance.vision/stream?streams=btcusdt@ticker/ethusdt@ticker/…`
- Maps our display symbols → Binance pairs via the existing `binanceSymbol()`; symbols with no pair are skipped (they keep their snapshot).
- Each message `{ stream, data }` is parsed with the existing `parseTicker` and keyed by our symbol.
- Same resilience as `openTickerStream`: auto-reconnect with backoff, and a REST batch-poll fallback (`/ticker/24hr`) if the socket can't stay open.

**New hook** `hooks/useLiveTickers.ts`:

```ts
export function useLiveTickers(symbols: string[], enabled = true): Map<string, LiveTicker>
```

Returns a live map, re-subscribing when the symbol set changes (stringified key to avoid churn).

**Overlay helper** (pure function, exported from `lib/binance.ts` alongside the ticker types):

```ts
export function overlayLiveTickers(assets: Asset[], live: Map<string, LiveTicker>): Asset[]
```

For each asset, if a live ticker exists for its symbol, override `price`, `change24h`, and (when present) `high24h`/`low24h`/`volume24h`; otherwise return the asset unchanged. Pure and independently testable.

**Wiring:**
- **Dashboard → CryptoBoard**: subscribe to the visible coins' symbols, overlay before passing `assets` to `PricesPanel`, `Heatmap`, `FeaturedCoin` (BTC/ETH), and `ExploreAssets`.
- **Markets → Crypto** (`pages/MarketsCrypto.tsx` + `components/markets/MarketTable.tsx`): overlay live data onto the rows.

### Stocks — near-realtime (polling)

FMP's WebSocket is paid, so there is no free stream. Stocks update by polling:

- Re-fetch the bulk quote on an interval (default ~60s), **paused when `document.visibilityState === "hidden"`** to protect the 250/day budget.
- The `fmp.ts` bulk cache TTL is reduced so scheduled polls actually return fresh data (still cache-guarded against render churn).
- Wired into Dashboard stocks board, Markets → Stocks, and the stock detail page.
- The UI is honest: crypto shows a **"Live"** pulse; stocks are presented as periodically updating, not streaming.

A small reusable polling hook (`useInterval`-style, visibility-aware) drives this so the three stock surfaces share one implementation.

### Live indicator

A subtle "Live" pulse (reusing the existing `Radio` icon treatment from the detail page) appears on the Dashboard and Markets headers when a crypto ticker stream is connected.

---

## Feature 3 — Heatmap Restyle

Keep the Recharts `Treemap` with its squarified, market-cap-weighted layout (big tiles = big coins, like Binance). The changes are purely visual + interactive, in `components/charts/Heatmap.tsx`.

- **Remove black outlines:** drop `stroke="#0A0E1A"` on the `Treemap`. Tiles get separation from a thin inset gap drawn in the cell (e.g. rect at `x+1, y+1, width−2, height−2`, rounded), not a heavy border.
- **All-white text, always:** delete the dynamic light/dark `textColor` logic. Text is white (`#F8FAFC`) with a soft drop-shadow (`0 1px 2px rgba(0,0,0,.45)`) for legibility — a shadow, not a stroke/outline.
- **Deeper color ramp:** retune `tileColor` so greens and reds are saturated/deep enough that white text always clears WCAG AA contrast across the whole range (no pale mint/pink tiles).
- **Content:** symbol + %change in white; tiles above a size threshold also show live price.
- **Hover:** highlight the hovered tile (brightness/ring) and show a small HTML tooltip (symbol, price, %change, market cap). Click still navigates to the asset (existing behavior).
- **Realtime:** the heatmap consumes the live-overlaid `assets` from the Dashboard, so tiles recolor and reprice without a refresh.

---

## Components & Files

| File | Change |
|------|--------|
| `lib/coingecko.ts` | `OHLCPoint` gains `volume?`, `quoteVolume?` |
| `lib/binance.ts` | `klineToPoint` + live-kline read volume/quoteVolume; new `openMultiTickerStream`; `overlayLiveTickers` |
| `lib/fmp.ts` | `StockOHLCPoint.volume?` parsed; reduced bulk cache TTL for polling |
| `hooks/useLiveTickers.ts` | **new** — multi-symbol live ticker map |
| `hooks/useInterval` (visibility-aware) | **new** — shared stock polling driver |
| `components/charts/CandlestickChart.tsx` | crosshair tooltip overlay + time→point map |
| `components/charts/Heatmap.tsx` | restyle: white text, no outlines, ramp, hover tooltip, live price |
| `pages/Dashboard.tsx` | overlay live crypto; poll stocks; Live indicator |
| `pages/MarketsCrypto.tsx`, `components/markets/MarketTable.tsx` | overlay live crypto on rows |
| `pages/MarketsStocks.tsx` | poll stocks |
| `pages/AssetDetail.tsx` | pass volume through to tooltip; poll stock quote |

## Cross-cutting requirements (unchanged, must be preserved)

- **WCAG 2.1 AA**, mobile-web responsive, cross-browser.
- **$0 cost forever** — no new paid APIs; stock polling is visibility-gated to respect FMP's 250/day.
- Graceful degradation: every live path falls back to the existing snapshot/seed data when a socket or key is unavailable.

## Testing

- **Pure functions** get unit tests: `overlayLiveTickers` (override vs. passthrough vs. non-Binance symbol), the tooltip derived-field math (Chg/%Chg/Range against the screenshot values), and FMP volume parsing.
- **Manual verification** (`npm run dev`): hover tooltip matches the screenshot on a Binance coin; Dashboard/Markets prices tick without refresh; stocks update on the poll interval and pause on a hidden tab; heatmap text is white and readable with no black outlines.
- `npm run build` (type-check) and `npm run lint` clean.

## Sequencing

1. Data plumbing (`OHLCPoint`/`StockOHLCPoint` fields + lib sourcing).
2. Candle hover tooltip.
3. Crypto realtime (stream + hook + overlay) wired into Dashboard, then Markets.
4. Stock polling wired into the three stock surfaces.
5. Heatmap restyle.
6. Verify (build, lint, manual), then create the GitHub repo and push.
