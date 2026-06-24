# Meridian — Crypto & Stock Tracker
**Design Spec** | 2026-06-24

---

## Overview

Meridian is a dark-themed, professional crypto and stock price tracker. Users can browse live market prices without an account. Logged-in users can save a personal watchlist and simulate a portfolio by entering asset quantities to see their total estimated value update in real time.

This is a portfolio project showcasing React full-stack skills (Supabase auth, live API integration, data visualisation) combined with strong UI/UX design.

---

## Goals

- Demonstrate React + TypeScript + Supabase full-stack capability
- Show strong visual design taste via a polished dark finance UI
- Use two real public APIs with zero cost
- Deploy as a live, functional demo employers can click through

## Non-Functional Requirements (apply to every page/component)

- **Accessibility (WCAG 2.1 AA):** semantic HTML, keyboard navigation, visible focus states, ARIA labels on icon-only buttons, sufficient colour contrast (price green/red verified against dark bg), `aria-live` regions for price updates, alt text on images, respects `prefers-reduced-motion`.
- **Mobile-web responsive:** mobile-first layouts, fluid grids, touch-friendly tap targets (min 44×44px), responsive tables (cards on mobile, table on desktop), no horizontal scroll.
- **Cross-browser:** works on current Chrome, Firefox, Safari, Edge; no browser-specific APIs without fallback; standard CSS via Tailwind (autoprefixed).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 (dark theme tokens) |
| Routing | React Router v6 |
| Charts | Recharts |
| Icons | lucide-react |
| Auth + DB | Supabase (free tier) |
| Crypto data | CoinGecko API (free, no key required) |
| Stock data | Alpha Vantage API (free key, 25 req/day) |

---

## Pages

### 1. Dashboard (/)
- Market summary bar: total crypto market cap, BTC dominance, global market 24h change
- Search bar (searches both crypto and stocks)
- "Top Crypto" section: price cards for BTC, ETH, BNB, SOL, XRP (live prices, 24h change %)
- "Top Stocks" section: price cards for AAPL, TSLA, GOOGL, MSFT, AMZN
- Each card shows: logo/icon, name, symbol, current price, 24h change (green/red badge)
- Public — no login required

### 2. Markets — Crypto (/markets/crypto)
- Full sortable table of top 100 cryptocurrencies from CoinGecko
- Columns: Rank, Name, Price, 24h Change %, 7d Change %, Market Cap, Volume
- Search/filter within the table
- Click any row → Asset Detail page
- Public

### 3. Markets — Stocks (/markets/stocks)
- Grid of popular stock symbols with live quote data from Alpha Vantage
- Shows: ticker, company name, price, change, change %
- Click any card → Asset Detail page
- Public

### 4. Asset Detail (/asset/:type/:symbol)
- Large price display with 24h change indicator
- Line chart showing 7-day price history (Recharts)
- Stats grid: Market Cap, 24h Volume, 24h High, 24h Low, All Time High (crypto only)
- "Add to Watchlist" button (triggers login modal if not logged in)
- Public to view; watchlist action requires login

### 5. Watchlist (/watchlist)
- User's saved assets in a clean card list with live prices
- Remove button per item
- Empty state with CTA to browse Markets
- Login required (redirect to /login if not authenticated)

### 6. Portfolio (/portfolio)
- Table of user's holdings: asset, quantity entered by user, current price, current value
- Total portfolio value displayed prominently at top
- "Add Holding" form: search asset → enter quantity → save
- Color-coded values (green if positive simulation, red if not)
- Login required
- NOTE: Ask user before building this page (per their instruction)

### 7. Login / Register (/login, /register)
- Email + password via Supabase Auth
- Clean centered card layout on dark background
- Toggle between Login and Register
- On success: redirect to previously attempted page or Dashboard

---

## Visual Design System

```
Colors:
  --bg-base:      #0A0E1A   (page background)
  --bg-card:      #111827   (card/panel background)
  --bg-elevated:  #1F2937   (hover states, inputs)
  --border:       #1F2937
  --brand:        #6366F1   (indigo — buttons, active nav, links)
  --up:           #22C55E   (price increase — green)
  --down:         #EF4444   (price decrease — red)
  --text-primary: #F9FAFB
  --text-muted:   #9CA3AF

Typography:
  Font: Inter (Google Fonts)
  Sizes follow Tailwind defaults

Layout:
  Desktop: fixed sidebar nav (64px wide, icon + label) + main content area
  Mobile:  bottom navigation bar with 5 icons
  Max content width: 1200px, centered
```

---

## Data Architecture

### CoinGecko API (crypto) — free, no auth
- `GET /coins/markets` — list with prices, market caps, 24h change
- `GET /coins/{id}/market_chart` — 7-day price history for charts
- `GET /search` — search coins by name/symbol

### Alpha Vantage API (stocks) — free key required
- `GLOBAL_QUOTE` function — current price, change, volume for a symbol
- `TIME_SERIES_DAILY` — price history for chart
- Key stored in `.env` as `VITE_ALPHA_VANTAGE_KEY`
- 25 req/day limit — stock detail page fetches on demand only (not bulk)

### Supabase Schema

```sql
-- watchlist
create table watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  asset_symbol text not null,
  asset_name text not null,
  asset_type text not null check (asset_type in ('crypto', 'stock')),
  asset_id text,  -- CoinGecko id for crypto (e.g. 'bitcoin')
  created_at timestamptz default now()
);
alter table watchlist enable row level security;
create policy "Users manage own watchlist" on watchlist
  for all using (auth.uid() = user_id);

-- portfolio_holdings
create table portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  asset_symbol text not null,
  asset_name text not null,
  asset_type text not null check (asset_type in ('crypto', 'stock')),
  asset_id text,
  quantity numeric not null default 0,
  created_at timestamptz default now()
);
alter table portfolio_holdings enable row level security;
create policy "Users manage own portfolio" on portfolio_holdings
  for all using (auth.uid() = user_id);
```

---

## Project Structure

```
meridian/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/         Sidebar, BottomNav, Header
│   │   ├── ui/             PriceCard, Changebadge, StatGrid, SearchBar
│   │   ├── charts/         PriceChart (Recharts wrapper)
│   │   └── auth/           LoginModal, AuthGuard
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── MarketsCrypto.tsx
│   │   ├── MarketsStocks.tsx
│   │   ├── AssetDetail.tsx
│   │   ├── Watchlist.tsx
│   │   ├── Portfolio.tsx
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── hooks/
│   │   ├── useCryptoMarkets.ts
│   │   ├── useCryptoChart.ts
│   │   ├── useStockQuote.ts
│   │   └── useWatchlist.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── coingecko.ts
│   │   └── alphavantage.ts
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── types/
│   │   └── index.ts
│   └── App.tsx
├── supabase/
│   └── schema.sql
├── .env.example
└── package.json
```

---

## Build Phases

1. **Foundation** — Vite scaffold, Tailwind dark theme, routing, layout (sidebar + bottom nav), Supabase client
2. **Dashboard + Markets** — CoinGecko integration, price cards, crypto markets table
3. **Stock Markets** — Alpha Vantage integration, stock cards
4. **Asset Detail** — price chart, stats, watchlist button
5. **Auth** — Supabase login/register, AuthContext, protected routes
6. **Watchlist** — save/remove assets, live price display
7. **Portfolio** — (build after user confirmation) add holdings, calculate total value

---

## Cost Summary

| Service | Cost |
|---------|------|
| CoinGecko API | Free forever |
| Alpha Vantage API | Free (no card required) |
| Supabase | Free tier (no card required) |
| Hosting (Vercel/Netlify) | Free tier available |
| **Total** | **$0** |
