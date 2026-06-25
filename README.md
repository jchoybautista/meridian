# Meridian — Crypto & Stock Tracker

A dark-themed, fully responsive crypto and stock price tracker built with React,
TypeScript, and Supabase. Browse live market prices, search assets, view price
history charts, and (when signed in) save a personal watchlist.

![Stack](https://img.shields.io/badge/React-19-61DAFB) ![TS](https://img.shields.io/badge/TypeScript-strict-3178C6) ![Cost](https://img.shields.io/badge/cost-%240-22C55E)

## Features

- **Dashboard** — global market stats, live prices, a market-cap heatmap, top crypto + popular stocks, global search
- **Realtime** — crypto prices, the heatmap, and charts update live via Binance WebSockets (no refresh); stocks poll periodically (free tier has no streaming)
- **Crypto Markets** — sortable, filterable table of the top 100 coins, updating live via Binance
- **Stock Markets** — popular stocks (FMP / Alpha Vantage, with sample-data fallback)
- **Asset Detail** — live price + candlestick chart (Binance) with a Binance-style OHLC hover tooltip, key stats, watchlist toggle
- **Auth** — email/password sign-in & registration (Supabase)
- **Watchlist** — save and track favourite assets, synced to your account
- **Accessible** — WCAG 2.1 AA: semantic HTML, keyboard nav, focus rings,
  screen-reader labels, reduced-motion support, colour-plus-icon indicators
- **Responsive** — desktop sidebar + mobile bottom nav; tables collapse to cards
- **Cross-browser** — standard, autoprefixed CSS via Tailwind

## Tech Stack

React 19 · Vite · TypeScript · Tailwind CSS v3 · React Router · Recharts ·
lucide-react · Supabase · CoinGecko API · Alpha Vantage API

## Getting Started

```bash
npm install
cp .env.example .env   # then fill in your keys (see below)
npm run dev
```

The app runs **without any keys** — crypto data is live (CoinGecko needs no key)
and stocks fall back to sample data. Add keys to unlock live stocks and accounts.

### Environment Variables (all free, no credit card)

| Variable | Where to get it | Required? |
|----------|-----------------|-----------|
| `VITE_SUPABASE_URL` | [supabase.com](https://supabase.com) → Project → Settings → API | For login/watchlist |
| `VITE_SUPABASE_ANON_KEY` | same page (anon public key) | For login/watchlist |
| `VITE_ALPHA_VANTAGE_KEY` | [alphavantage.co](https://www.alphavantage.co/support/#api-key) | For live stock quotes |

> CoinGecko's free public API needs no key. Alpha Vantage's free tier allows
> 25 requests/day — Meridian only calls it on individual stock detail pages and
> falls back to sample data otherwise, so the demo always works.

### Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it.
3. Copy your Project URL and anon key into `.env`.

## Scripts

```bash
npm run dev      # start dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
npm run lint     # lint with oxlint
```

## Project Structure

```
src/
  components/   layout, ui, charts, auth
  context/      AuthContext
  hooks/        useAsync, useWatchlist
  lib/          supabase, coingecko, alphavantage, format
  pages/        Dashboard, Markets*, AssetDetail, Watchlist, Login, Register
  types/        shared TypeScript types
supabase/       schema.sql
docs/           design spec
```

## Roadmap

- Portfolio simulation (enter holdings → see total value) — schema ready, UI on request
- Price-change alerts
- Light theme toggle

---

Built as a portfolio project demonstrating full-stack React with a focus on
design and accessibility.
