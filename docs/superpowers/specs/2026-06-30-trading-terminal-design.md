# Trading Terminal + Wallet — Design Spec

**Date:** 2026-06-30  
**Status:** Approved  

---

## Overview

Add a Binance-style paper trading terminal to the AssetDetail page, covering both crypto and stocks. All trades are simulated — no real orders execute. Order history and wallet balance persist in Supabase.

A companion Wallet page lets users manage their paper balance and view their full order history and holdings.

---

## Data Model

### Supabase Tables

**`paper_wallet`** — one row per user, seeded at $10,000 on first access.

```sql
CREATE TABLE paper_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  balance_usd decimal NOT NULL DEFAULT 10000,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE paper_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet" ON paper_wallet USING (user_id = auth.uid());
```

**`paper_orders`** — every order submitted.

```sql
CREATE TABLE paper_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  asset_id text NOT NULL,        -- "bitcoin" | "AAPL"
  asset_type text NOT NULL,      -- "crypto" | "stock"
  asset_symbol text NOT NULL,    -- "BTC" | "AAPL"
  asset_name text NOT NULL,
  side text NOT NULL,            -- "buy" | "sell"
  order_type text NOT NULL,      -- "limit" | "market" | "stop-limit"
  quantity decimal NOT NULL,
  price decimal,                 -- limit price; null for market
  stop_price decimal,            -- stop-limit only
  tp_price decimal,              -- take profit trigger
  sl_price decimal,              -- stop loss trigger
  leverage int DEFAULT 1,        -- 1 = no margin; 2/5/10 = leveraged (crypto only)
  status text NOT NULL DEFAULT 'pending',  -- "pending" | "filled" | "cancelled"
  filled_price decimal,
  filled_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE paper_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders" ON paper_orders USING (user_id = auth.uid());
```

**Positions** are derived at query time: sum of (quantity × side sign) for all filled orders per user per asset. No separate positions table.

---

## Component Architecture

```
AssetDetail.tsx
  └── TradingPanel          (new — appended below existing content)
        ├── OrderBook       (left column)
        │     ├── Ask rows: 10 levels, red, price + qty + depth bar
        │     ├── Spread row: mid-price + spread %
        │     └── Bid rows: 10 levels, green
        └── TradeForm       (right column)
              ├── Buy / Sell tabs
              ├── Order type: Limit | Market | Stop-Limit
              ├── Price input (hidden for Market)
              ├── Stop Price input (Stop-Limit only)
              ├── Amount input + 25/50/75/100% slider
              ├── Total (auto-computed; price × amount; editable)
              ├── TP / SL toggle → two collapsible price inputs
              ├── Margin toggle + leverage picker 2× 5× 10× (crypto only)
              ├── Available balance display
              └── Submit → confirm dialog → Supabase write
```

### New Files

| Path | Purpose |
|---|---|
| `src/components/trading/TradingPanel.tsx` | Container, layout, data orchestration |
| `src/components/trading/OrderBook.tsx` | Live order book display |
| `src/components/trading/TradeForm.tsx` | Buy/sell form with all controls |
| `src/lib/paperTrading.ts` | Supabase helpers: wallet, orders, positions |
| `src/pages/Wallet.tsx` | Balance, add funds, history, holdings |

---

## Order Book

### Crypto
Uses Binance WebSocket depth stream (`@depth20@100ms`) already wired in `binance.ts`. Streams 20 levels of real bids/asks. Display top 10 of each.

### Stocks
Finnhub does not provide L2 order book data. Generate a simulated order book:
- 10 ask levels above current price, spaced by 0.05–0.2% increments
- 10 bid levels below current price, same spacing
- Random quantities per level (seeded from asset id for stability, jittered ±10% every 2 seconds)
- Depth bar: bar width = level qty / max qty across all levels

### Display
Each row: `[price] [quantity] [depth bar]`. Asks sorted descending (closest to mid at bottom), bids sorted descending (closest to mid at top). Mid-price row in the center shows current price and spread percentage.

---

## Trade Form — Interactivity

### Order Types
- **Limit** — user sets price + amount. Total = price × amount.
- **Market** — user sets amount only. Executes at current live price.
- **Stop-Limit** — user sets stop price, limit price, amount.

### Auto-Compute (all fields linked)
- Edit price → recalculate total
- Edit amount → recalculate total
- Edit total → recalculate amount
- Click % button → set amount = (balance × %) / price

### TP / SL
Collapsible section. When enabled, two price inputs appear. On order fill, the system registers TP/SL triggers.

### Margin (crypto only)
Toggle switch. When on, a segmented control shows 2× / 5× / 10×. Leverage multiplies buying power for display only — stored on the order, risk/reward scaled accordingly.

---

## Order Execution Logic

### Execution Rules

| Order type | Fills when |
|---|---|
| Market | Immediately at current live price |
| Limit Buy | Live price ≤ limit price |
| Limit Sell | Live price ≥ limit price |
| Stop-Limit Buy | Live price ≥ stop price, then fills as limit buy |
| Stop-Limit Sell | Live price ≤ stop price, then fills as limit sell |

### Background Fill Checker
A `usePendingOrders` hook polls every 5 seconds. For each pending order, it compares the limit/stop price against the current live price and calls `fillOrder()` in Supabase if triggered. Runs only while the user is authenticated.

### TP / SL Monitoring
After a buy fills, if TP or SL is set, the fill checker registers them as synthetic pending sell orders. Same 5-second polling loop handles them.

### Balance Management
- Buy: deduct `quantity × filled_price` from `paper_wallet.balance_usd`
- Sell: add `quantity × filled_price` to `paper_wallet.balance_usd`
- Margin buys: deduct `(quantity × filled_price) / leverage` (margin amount only)

---

## Wallet Page (`/wallet`)

### Sections

**Balance card** — current USD balance + total portfolio value (positions × live prices).

**Add Funds modal** — tabs: Credit Card / PayPal / GCash / PayMaya. Each tab has an amount input and a confirm button. No real payment processing — clicking confirm calls `updateWallet(amount)` in Supabase. Amount range: $10–$100,000.

**Holdings table** — one row per asset with an open position: symbol, name, quantity, avg cost, current price, current value, unrealised P&L (colour-coded).

**Order history table** — all orders, newest first. Columns: time, asset, side, type, qty, price, status. Filterable by status (all / filled / pending / cancelled).

### Nav
Wallet link added to the main sidebar navigation.

---

## Error Handling

- Supabase unavailable: TradeForm shows "Sign in to trade" if unauthenticated; shows error toast on failed write.
- Order book WebSocket disconnects: falls back to simulated book with a subtle "Simulated" badge.
- Insufficient balance: Submit button disabled with tooltip "Insufficient funds".
- Selling more than held: Submit button disabled with "Exceeds position".

---

## Scope Boundaries

- No real order routing — purely paper/simulated.
- No real payment processing — Add Funds is mock UI only.
- Margin is visual/simulated only — no liquidation engine.
- TP/SL polling is best-effort (5s granularity) — not guaranteed to fill at exact price.
