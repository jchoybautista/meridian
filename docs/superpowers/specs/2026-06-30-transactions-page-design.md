# Transactions Page — Design Spec
Date: 2026-06-30

## Overview

Add a `/transactions` page showing the user's paper trading + portfolio transaction history, styled like standard crypto exchange transaction screens (Binance, Coinbase) in Meridian's dark theme. Update the dashboard "Latest Transactions" panel to link to this page instead of external mempool.space URLs.

## Routes & Navigation

- New route: `/transactions` (auth-protected via `AuthGuard`)
- New nav item in `navItems.ts`: label `Transactions`, icon `Receipt` from lucide-react, `to: "/transactions"`, `protected: true`
- Added to both Sidebar and BottomNav automatically (they read from `NAV_ITEMS`)

## Data

No new API calls. The page uses **static dummy seed data** defined inline — an array of ~15 transactions covering a mix of:
- Asset types: crypto (BTC, ETH, SOL) and stock (AAPL, TSLA)
- Sides: buy and sell
- Statuses: completed, pending, cancelled
- Dates spread across the past 30 days

Shape of each dummy transaction:
```ts
{
  id: string           // uuid-style string
  asset_symbol: string // "BTC", "AAPL", etc.
  asset_name: string   // "Bitcoin", "Apple Inc.", etc.
  asset_type: "crypto" | "stock"
  side: "buy" | "sell"
  order_type: "market" | "limit" | "stop-limit"
  quantity: number
  price: number        // price per unit in USD
  status: "completed" | "pending" | "cancelled"
  created_at: string   // ISO timestamp
}
```

## Page Layout

### Header
`PageHeader` component with title "Transactions" and subtitle "Your paper trading & portfolio activity".

### Filter Bar
Horizontal row of pill/select filters (same card style as the rest of the app):
- **Type**: All · Buy · Sell  
- **Asset**: All · Crypto · Stock  
- **Status**: All · Completed · Pending · Cancelled  

Filters are local state — no URL params needed for this scope.

### Transaction Table (desktop, lg+)
Columns: **Item** · **Status** · **Type** · **Order** · **Amount** · **Total** · **Time**

| Column  | Content |
|---------|---------|
| Item    | `AssetIcon` + asset name + symbol (same pattern as `MarketTable`) |
| Status  | Colored dot + label — green=Completed, yellow=Pending, red=Cancelled |
| Type    | Buy / Sell badge |
| Order   | market / limit / stop-limit |
| Amount  | `quantity` formatted with up to 6 decimal places |
| Total   | `quantity × price` formatted as USD |
| Time    | Date + time string |

### Mobile cards (below lg)
Each transaction as a card row:
- Left: AssetIcon + name + symbol
- Right: Total USD (bold), side badge, status dot, time (muted)

### Empty state
If filters produce no results: centered text "No transactions match your filters." using the existing `Empty` component from `States.tsx`.

## Dashboard Panel Change

In `LatestTransactions.tsx`:
- Keep the mempool TX list exactly as-is (it's useful market context)
- Replace each `<a href="https://mempool.space/tx/...">` link with a plain `<span>` (non-clickable tx ID)
- Add a "View all transactions →" link at the bottom of the panel using React Router `<Link to="/transactions">` styled as `text-brand text-xs hover:underline`

## Styling

Follows existing conventions:
- Page background: `bg-base`
- Table/cards: `card` class (`bg-card` + border)
- Row hover: `hover:bg-elevated`
- Borders: `border-line`
- Muted text: `text-ink-muted`
- Brand accent: `text-brand`
- Up/positive: `text-up` (`#22C55E`)
- Down/negative: `text-down` (`#EF4444`)
- Pending: `text-yellow-400`

## Files Affected

| File | Change |
|------|--------|
| `src/components/layout/navItems.ts` | Add Transactions nav item |
| `src/pages/Transactions.tsx` | New page (create) |
| `src/App.tsx` | Add `/transactions` route inside `AuthGuard` |
| `src/components/dashboard/LatestTransactions.tsx` | Remove mempool external links, add "View all" link |

## Out of Scope

- Real data from Supabase (dummy data only for now)
- Pagination (15 rows fits one screen; can be added later)
- Sorting columns
- Export / date range filter
