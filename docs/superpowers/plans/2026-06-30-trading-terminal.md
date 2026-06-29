# Trading Terminal + Wallet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Binance-style paper trading terminal to the AssetDetail page (inline below existing content) plus a Wallet page, both backed by two new Supabase tables (`paper_wallet`, `paper_orders`).

**Architecture:** TradingPanel mounts below existing AssetDetail content via a single import + JSX line. It contains an OrderBook (Binance WebSocket depth stream for crypto, simulated for stocks) and a TradeForm (limit/market/stop-limit with TP/SL and margin toggle). Orders and wallet balance persist in Supabase. A 5-second polling loop inside `usePaperOrders` fills pending limit orders against the live price. Market orders fill instantly on placement.

**Tech Stack:** React 19 + TypeScript 6 + Tailwind CSS 3 + Supabase JS v2 + Vitest 3 + Lucide React

## Global Constraints

- Dark theme tokens — use only Tailwind classes mapped in `tailwind.config.js`:
  - `bg-base` (#0A0E1A), `bg-card` (#111827), `bg-elevated` (#1F2937)
  - `text-ink` (#F9FAFB), `text-ink-muted` (#9CA3AF)
  - `text-up` / `bg-up` (#22C55E), `text-down` / `bg-down` (#EF4444), `text-brand` / `bg-brand` (#6366F1)
  - Use `border-line` for all borders, `card` for card elements (existing Tailwind component class)
- All Supabase calls guard against `supabase === null` (env vars may be absent)
- Paper trading only — no real orders execute, no real payments process
- Stocks: order book is fully simulated (Finnhub/FMP do not provide L2 depth data)
- Crypto: Binance WebSocket depth stream; degrade silently to simulated on WS failure
- No `any` type unless the external API response leaves no alternative
- `supabase.from("paper_orders")` / `supabase.from("paper_wallet")` — exact table names

---

## File Map

| Status | Path | Role |
|---|---|---|
| **Create** | `src/lib/paperTrading.ts` | All Supabase helpers: wallet CRUD, order CRUD, pure `derivePositions` |
| **Create** | `src/lib/paperTrading.test.ts` | Unit tests for `derivePositions` (pure function) |
| **Modify** | `src/lib/binance.ts` | Append `DepthLevel`, `DepthBook`, `openDepthStream`, `buildSimulatedBook` |
| **Create** | `src/hooks/usePaperWallet.ts` | React hook — wallet state + `addFunds` |
| **Create** | `src/hooks/usePaperOrders.ts` | React hook — orders state + `placeOrder` + background fill checker |
| **Create** | `src/components/trading/OrderBook.tsx` | Order book display (live or simulated) |
| **Create** | `src/components/trading/TradeForm.tsx` | Buy/sell form — all controls + auto-compute + confirm dialog |
| **Create** | `src/components/trading/TradingPanel.tsx` | Container wiring OrderBook + TradeForm + open orders list |
| **Modify** | `src/pages/AssetDetail.tsx` | Import + render `<TradingPanel>` at bottom of the asset fragment |
| **Create** | `src/pages/Wallet.tsx` | Balance card + add-funds modal + holdings table + order history |
| **Modify** | `src/App.tsx` | Add `/wallet` protected route |
| **Modify** | `src/components/layout/navItems.ts` | Add Wallet nav item |

---

## Task 1: Supabase Schema + `paperTrading.ts` Library

**Files:**
- Create: `src/lib/paperTrading.ts`
- Create: `src/lib/paperTrading.test.ts`

**Interfaces produced (used by all later tasks):**
```typescript
PaperWallet   { id, user_id, balance_usd, created_at }
PaperOrder    { id, user_id, asset_id, asset_type, asset_symbol, asset_name,
                side, order_type, quantity, price, stop_price, tp_price,
                sl_price, leverage, status, filled_price, filled_at, created_at }
Position      { asset_id, asset_type, asset_symbol, asset_name, quantity,
                avg_cost, total_cost }
NewOrder      (PaperOrder without id / status / filled_price / filled_at / created_at)

getOrCreateWallet(userId: string): Promise<PaperWallet>
addFunds(userId: string, amount: number): Promise<PaperWallet>
adjustBalance(userId: string, delta: number): Promise<void>
getUserOrders(userId: string): Promise<PaperOrder[]>
getPendingOrders(userId: string): Promise<PaperOrder[]>
placeOrder(order: NewOrder): Promise<PaperOrder>
fillOrder(orderId, filledPrice, side, quantity, leverage, userId): Promise<void>
cancelOrder(orderId: string): Promise<void>
derivePositions(orders: PaperOrder[]): Position[]
```

- [ ] **Step 1: Run SQL migration in Supabase dashboard**

Open your Supabase project → SQL Editor → New query → paste and run:

```sql
CREATE TABLE IF NOT EXISTS paper_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  balance_usd decimal NOT NULL DEFAULT 10000,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE paper_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wallet" ON paper_wallet
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS paper_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  asset_id text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('crypto', 'stock')),
  asset_symbol text NOT NULL,
  asset_name text NOT NULL,
  side text NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type text NOT NULL CHECK (order_type IN ('limit', 'market', 'stop-limit')),
  quantity decimal NOT NULL CHECK (quantity > 0),
  price decimal,
  stop_price decimal,
  tp_price decimal,
  sl_price decimal,
  leverage integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'filled', 'cancelled')),
  filled_price decimal,
  filled_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE paper_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own orders" ON paper_orders
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/paperTrading.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { derivePositions } from "./paperTrading";
import type { PaperOrder } from "./paperTrading";

const base: PaperOrder = {
  id: "o1",
  user_id: "u1",
  asset_id: "bitcoin",
  asset_type: "crypto",
  asset_symbol: "BTC",
  asset_name: "Bitcoin",
  side: "buy",
  order_type: "market",
  quantity: 0.1,
  price: null,
  stop_price: null,
  tp_price: null,
  sl_price: null,
  leverage: 1,
  status: "filled",
  filled_price: 50000,
  filled_at: "2024-01-01T00:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
};

describe("derivePositions", () => {
  it("returns empty array for no orders", () => {
    expect(derivePositions([])).toEqual([]);
  });

  it("builds a position from a single buy", () => {
    const [pos] = derivePositions([base]);
    expect(pos.asset_id).toBe("bitcoin");
    expect(pos.quantity).toBeCloseTo(0.1);
    expect(pos.avg_cost).toBeCloseTo(50000);
    expect(pos.total_cost).toBeCloseTo(5000);
  });

  it("ignores pending orders", () => {
    const pending = { ...base, status: "pending" as const, filled_price: null, filled_at: null };
    expect(derivePositions([pending])).toHaveLength(0);
  });

  it("ignores cancelled orders", () => {
    const cancelled = { ...base, status: "cancelled" as const, filled_price: null, filled_at: null };
    expect(derivePositions([cancelled])).toHaveLength(0);
  });

  it("nets out a full sell so the position disappears", () => {
    const sell: PaperOrder = { ...base, id: "o2", side: "sell" };
    expect(derivePositions([base, sell])).toHaveLength(0);
  });

  it("averages cost across two buys at different prices", () => {
    const b1: PaperOrder = { ...base, id: "o1", quantity: 1, filled_price: 40000 };
    const b2: PaperOrder = { ...base, id: "o2", quantity: 1, filled_price: 60000 };
    const [pos] = derivePositions([b1, b2]);
    expect(pos.quantity).toBeCloseTo(2);
    expect(pos.avg_cost).toBeCloseTo(50000);
  });

  it("handles 2× leveraged buy (margin cost is quantity×price/leverage)", () => {
    const leveraged: PaperOrder = { ...base, id: "o1", leverage: 2, quantity: 1, filled_price: 100 };
    const [pos] = derivePositions([leveraged]);
    expect(pos.total_cost).toBeCloseTo(50); // 100 * 1 / 2
    expect(pos.avg_cost).toBeCloseTo(50);
  });

  it("handles two different assets independently", () => {
    const eth: PaperOrder = { ...base, id: "o2", asset_id: "ethereum", asset_symbol: "ETH", filled_price: 3000 };
    const positions = derivePositions([base, eth]);
    expect(positions).toHaveLength(2);
    expect(positions.find((p) => p.asset_id === "bitcoin")?.avg_cost).toBeCloseTo(50000);
    expect(positions.find((p) => p.asset_id === "ethereum")?.avg_cost).toBeCloseTo(3000);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL with "Cannot find module"**

```bash
npx vitest run src/lib/paperTrading.test.ts
```

Expected: FAIL — `derivePositions` not exported yet.

- [ ] **Step 4: Create `src/lib/paperTrading.ts`**

```typescript
import { supabase } from "./supabase";

export type AssetType = "crypto" | "stock";
export type OrderSide = "buy" | "sell";
export type OrderType = "limit" | "market" | "stop-limit";
export type OrderStatus = "pending" | "filled" | "cancelled";

export interface PaperWallet {
  id: string;
  user_id: string;
  balance_usd: number;
  created_at: string;
}

export interface PaperOrder {
  id: string;
  user_id: string;
  asset_id: string;
  asset_type: AssetType;
  asset_symbol: string;
  asset_name: string;
  side: OrderSide;
  order_type: OrderType;
  quantity: number;
  price: number | null;
  stop_price: number | null;
  tp_price: number | null;
  sl_price: number | null;
  leverage: number;
  status: OrderStatus;
  filled_price: number | null;
  filled_at: string | null;
  created_at: string;
}

export interface Position {
  asset_id: string;
  asset_type: AssetType;
  asset_symbol: string;
  asset_name: string;
  quantity: number;
  avg_cost: number;
  total_cost: number;
}

export interface NewOrder {
  user_id: string;
  asset_id: string;
  asset_type: AssetType;
  asset_symbol: string;
  asset_name: string;
  side: OrderSide;
  order_type: OrderType;
  quantity: number;
  price: number | null;
  stop_price: number | null;
  tp_price: number | null;
  sl_price: number | null;
  leverage: number;
}

export async function getOrCreateWallet(userId: string): Promise<PaperWallet> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: existing } = await supabase
    .from("paper_wallet")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing as PaperWallet;
  const { data, error } = await supabase
    .from("paper_wallet")
    .insert({ user_id: userId, balance_usd: 10000 })
    .select()
    .single();
  if (error) throw error;
  return data as PaperWallet;
}

export async function addFunds(userId: string, amount: number): Promise<PaperWallet> {
  if (!supabase) throw new Error("Supabase not configured");
  const wallet = await getOrCreateWallet(userId);
  const { data, error } = await supabase
    .from("paper_wallet")
    .update({ balance_usd: wallet.balance_usd + amount })
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as PaperWallet;
}

export async function adjustBalance(userId: string, delta: number): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const wallet = await getOrCreateWallet(userId);
  const { error } = await supabase
    .from("paper_wallet")
    .update({ balance_usd: wallet.balance_usd + delta })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getUserOrders(userId: string): Promise<PaperOrder[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("paper_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PaperOrder[];
}

export async function getPendingOrders(userId: string): Promise<PaperOrder[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("paper_orders")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending");
  if (error) throw error;
  return (data ?? []) as PaperOrder[];
}

export async function placeOrder(order: NewOrder): Promise<PaperOrder> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("paper_orders")
    .insert({ ...order, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data as PaperOrder;
}

export async function fillOrder(
  orderId: string,
  filledPrice: number,
  side: OrderSide,
  quantity: number,
  leverage: number,
  userId: string,
): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase
    .from("paper_orders")
    .update({
      status: "filled",
      filled_price: filledPrice,
      filled_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  if (error) throw error;
  const cost = (filledPrice * quantity) / leverage;
  await adjustBalance(userId, side === "buy" ? -cost : cost);
}

export async function cancelOrder(orderId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase
    .from("paper_orders")
    .update({ status: "cancelled" })
    .eq("id", orderId);
  if (error) throw error;
}

export function derivePositions(orders: PaperOrder[]): Position[] {
  const map = new Map<
    string,
    { asset_id: string; asset_type: AssetType; asset_symbol: string; asset_name: string; quantity: number; total_cost: number }
  >();

  for (const o of orders.filter((o) => o.status === "filled")) {
    const entry = map.get(o.asset_id) ?? {
      asset_id: o.asset_id,
      asset_type: o.asset_type,
      asset_symbol: o.asset_symbol,
      asset_name: o.asset_name,
      quantity: 0,
      total_cost: 0,
    };
    if (o.side === "buy") {
      entry.quantity += o.quantity;
      entry.total_cost += (o.filled_price! * o.quantity) / o.leverage;
    } else {
      entry.quantity -= o.quantity;
      entry.total_cost -= o.filled_price! * o.quantity;
    }
    map.set(o.asset_id, entry);
  }

  return Array.from(map.values())
    .filter((p) => p.quantity > 1e-8)
    .map((p) => ({ ...p, avg_cost: p.total_cost / p.quantity }));
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx vitest run src/lib/paperTrading.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/paperTrading.ts src/lib/paperTrading.test.ts
git commit -m "feat: add paperTrading lib + Supabase schema (paper_wallet, paper_orders)"
```

---

## Task 2: Binance Depth Stream + Simulated Order Book

**Files:**
- Modify: `src/lib/binance.ts` (append only — do not touch existing exports)

**Interfaces produced:**
```typescript
DepthLevel   { price: number; quantity: number }
DepthBook    { bids: DepthLevel[]; asks: DepthLevel[] }

openDepthStream(symbol: string, onUpdate: (book: DepthBook) => void): () => void
buildSimulatedBook(currentPrice: number, seed: number): DepthBook
```

- [ ] **Step 1: Append to `src/lib/binance.ts`** (after the last existing export, before end of file)

```typescript
// ─── Order Book ───────────────────────────────────────────────────────────────

export interface DepthLevel {
  price: number;
  quantity: number;
}

export interface DepthBook {
  bids: DepthLevel[]; // sorted desc — highest bid first
  asks: DepthLevel[]; // sorted asc — lowest ask first
}

/**
 * Subscribes to Binance's 20-level depth stream for `symbol` at 100 ms updates.
 * Returns a cleanup function. Reconnects automatically on close.
 * If the symbol has no Binance pair, returns a no-op cleanup immediately.
 */
export function openDepthStream(
  symbol: string,
  onUpdate: (book: DepthBook) => void,
): () => void {
  const pair = binanceSymbol(symbol);
  if (!pair) return () => {};

  const url = `${WS}/${pair.toLowerCase()}@depth20@100ms`;
  let ws: WebSocket | null = null;
  let closed = false;

  function connect() {
    if (closed) return;
    ws = new WebSocket(url);
    ws.onmessage = (evt) => {
      try {
        const raw = JSON.parse(evt.data as string) as {
          bids: [string, string][];
          asks: [string, string][];
        };
        onUpdate({
          bids: raw.bids.slice(0, 10).map(([p, q]) => ({ price: +p, quantity: +q })),
          asks: raw.asks.slice(0, 10).map(([p, q]) => ({ price: +p, quantity: +q })),
        });
      } catch { /* ignore malformed frames */ }
    };
    ws.onerror = () => {};
    ws.onclose = () => { if (!closed) setTimeout(connect, 3000); };
  }

  connect();
  return () => { closed = true; ws?.close(); };
}

/** Deterministic hash in [0, 1) — safe against float overflow for typical seeds. */
function pseudoRand(n: number): number {
  return (Math.abs(Math.sin(n)) * 10000) % 1;
}

/**
 * Builds a 10-level simulated order book for stocks (or as a crypto fallback).
 * `seed` should be `Math.floor(Date.now() / 2000)` to jitter every 2 seconds.
 */
export function buildSimulatedBook(currentPrice: number, seed: number): DepthBook {
  const asks: DepthLevel[] = [];
  const bids: DepthLevel[] = [];
  for (let i = 0; i < 10; i++) {
    const spread = currentPrice * (0.0005 + i * 0.0003);
    asks.push({ price: currentPrice + spread, quantity: 50 + Math.floor(pseudoRand(seed + i * 13) * 900) });
    bids.push({ price: currentPrice - spread, quantity: 50 + Math.floor(pseudoRand(seed + i * 17 + 50) * 900) });
  }
  asks.sort((a, b) => a.price - b.price);
  bids.sort((a, b) => b.price - a.price);
  return { asks, bids };
}
```

- [ ] **Step 2: Run existing Binance tests to confirm nothing broke**

```bash
npx vitest run src/lib/binance.test.ts
```

Expected: all existing tests PASS (we only appended, never edited).

- [ ] **Step 3: Commit**

```bash
git add src/lib/binance.ts
git commit -m "feat: add order book depth stream + simulated book builder to binance.ts"
```

---

## Task 3: Paper Trading Hooks

**Files:**
- Create: `src/hooks/usePaperWallet.ts`
- Create: `src/hooks/usePaperOrders.ts`

**Interfaces produced:**
```typescript
// usePaperWallet
{ wallet: PaperWallet | null; loading: boolean; error: string | null;
  addFunds: (amount: number) => Promise<void>; refresh: () => void }

// usePaperOrders
{ orders: PaperOrder[]; positions: Position[]; loading: boolean;
  placeOrder: (order: NewOrder) => Promise<PaperOrder>;
  cancelOrder: (orderId: string) => Promise<void>;
  refresh: () => void }
```

- [ ] **Step 1: Create `src/hooks/usePaperWallet.ts`**

```typescript
import { useState, useEffect, useCallback } from "react";
import {
  getOrCreateWallet,
  addFunds as addFundsDB,
  type PaperWallet,
} from "../lib/paperTrading";

interface UsePaperWalletResult {
  wallet: PaperWallet | null;
  loading: boolean;
  error: string | null;
  addFunds: (amount: number) => Promise<void>;
  refresh: () => void;
}

export function usePaperWallet(userId: string | undefined): UsePaperWalletResult {
  const [wallet, setWallet] = useState<PaperWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrCreateWallet(userId)
      .then((w) => { if (!cancelled) setWallet(w); })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load wallet");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, tick]);

  const addFunds = useCallback(async (amount: number) => {
    if (!userId) return;
    const updated = await addFundsDB(userId, amount);
    setWallet(updated);
  }, [userId]);

  return { wallet, loading, error, addFunds, refresh };
}
```

- [ ] **Step 2: Create `src/hooks/usePaperOrders.ts`**

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getUserOrders,
  getPendingOrders,
  placeOrder as placeOrderDB,
  fillOrder,
  cancelOrder as cancelOrderDB,
  derivePositions,
  type PaperOrder,
  type NewOrder,
  type Position,
  type OrderSide,
} from "../lib/paperTrading";

interface UsePaperOrdersResult {
  orders: PaperOrder[];
  positions: Position[];
  loading: boolean;
  placeOrder: (order: NewOrder) => Promise<PaperOrder>;
  cancelOrder: (orderId: string) => Promise<void>;
  refresh: () => void;
}

export function usePaperOrders(
  userId: string | undefined,
  currentPrice: number,
  onFill?: () => void,
): UsePaperOrdersResult {
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const priceRef = useRef(currentPrice);
  priceRef.current = currentPrice;

  // Load all orders on mount and on refresh
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    getUserOrders(userId)
      .then((o) => { if (!cancelled) setOrders(o); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, tick]);

  // Background fill checker: every 5 s, fill any pending orders whose trigger is met
  useEffect(() => {
    if (!userId) return;
    const id = setInterval(async () => {
      const price = priceRef.current;
      if (!price) return;
      const pending = await getPendingOrders(userId);
      let filled = false;
      for (const o of pending) {
        let shouldFill = false;
        if (o.order_type === "market") {
          shouldFill = true;
        } else if (o.order_type === "limit") {
          if (o.side === "buy" && o.price != null) shouldFill = price <= o.price;
          if (o.side === "sell" && o.price != null) shouldFill = price >= o.price;
        } else if (o.order_type === "stop-limit") {
          // Simplified: fill when stop price is crossed (uses stop as the execution price)
          if (o.side === "sell" && o.stop_price != null) shouldFill = price <= o.stop_price;
          if (o.side === "buy" && o.stop_price != null) shouldFill = price >= o.stop_price;
        }
        if (shouldFill) {
          await fillOrder(o.id, price, o.side as OrderSide, o.quantity, o.leverage, userId);
          filled = true;
        }
      }
      if (filled) {
        onFill?.();
        refresh();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [userId, refresh, onFill]);

  const placeOrder = useCallback(async (order: NewOrder): Promise<PaperOrder> => {
    const placed = await placeOrderDB(order);
    if (placed.order_type === "market") {
      const price = priceRef.current;
      if (price > 0) {
        await fillOrder(placed.id, price, placed.side, placed.quantity, placed.leverage, userId!);
        onFill?.();
      }
    }
    refresh();
    return placed;
  }, [userId, refresh, onFill]);

  const cancelOrder = useCallback(async (orderId: string) => {
    await cancelOrderDB(orderId);
    refresh();
  }, [refresh]);

  return { orders, positions: derivePositions(orders), loading, placeOrder, cancelOrder, refresh };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors in the two new hook files.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePaperWallet.ts src/hooks/usePaperOrders.ts
git commit -m "feat: add usePaperWallet and usePaperOrders hooks"
```

---

## Task 4: OrderBook Component

**Files:**
- Create: `src/components/trading/OrderBook.tsx`

- [ ] **Step 1: Create `src/components/trading/OrderBook.tsx`**

```typescript
import { useState, useEffect } from "react";
import {
  openDepthStream,
  buildSimulatedBook,
  binanceSymbol,
  type DepthLevel,
  type DepthBook,
} from "../../lib/binance";
import { formatPrice } from "../../lib/format";

interface Props {
  assetType: "crypto" | "stock";
  symbol: string;
  currentPrice: number;
}

function DepthRow({
  level,
  maxQty,
  side,
}: {
  level: DepthLevel;
  maxQty: number;
  side: "ask" | "bid";
}) {
  const pct = maxQty > 0 ? (level.quantity / maxQty) * 100 : 0;
  return (
    <li className="relative flex items-center justify-between px-2 py-[3px] text-xs tabular-nums">
      <div
        className={`absolute inset-y-0 right-0 ${side === "ask" ? "bg-down/20" : "bg-up/20"}`}
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      />
      <span className={`relative z-10 font-mono ${side === "ask" ? "text-down" : "text-up"}`}>
        {formatPrice(level.price)}
      </span>
      <span className="relative z-10 text-ink-muted">{level.quantity.toFixed(2)}</span>
    </li>
  );
}

export function OrderBook({ assetType, symbol, currentPrice }: Props) {
  const [book, setBook] = useState<DepthBook | null>(null);
  const [simulated, setSimulated] = useState(false);

  // Live depth stream for crypto that's on Binance; simulated otherwise
  useEffect(() => {
    if (assetType !== "crypto" || !binanceSymbol(symbol)) {
      setSimulated(true);
      return;
    }
    setSimulated(false);
    setBook(null);
    return openDepthStream(symbol, setBook);
  }, [assetType, symbol]);

  // Simulated book: jitters every 2 s (seed changes every 2 s → different quantities)
  useEffect(() => {
    if (!simulated || !currentPrice) return;
    const tick = () => {
      setBook(buildSimulatedBook(currentPrice, Math.floor(Date.now() / 2000)));
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [simulated, currentPrice]);

  const maxQty = book
    ? Math.max(
        ...book.asks.map((l) => l.quantity),
        ...book.bids.map((l) => l.quantity),
        1,
      )
    : 1;

  const spread =
    book?.asks[0] && book?.bids[0] ? book.asks[0].price - book.bids[0].price : null;
  const spreadPct =
    spread != null && book?.asks[0]
      ? ((spread / book.asks[0].price) * 100).toFixed(3)
      : null;

  const skeletonRow = (i: number) => (
    <li key={i} className="h-[22px] px-2 py-[3px]">
      <div className="h-3 w-full skeleton rounded" />
    </li>
  );

  return (
    <div className="flex h-full flex-col text-[11px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-2 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Order Book
        </h3>
        {simulated && (
          <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] text-ink-muted">
            Simulated
          </span>
        )}
      </div>

      {/* Column labels */}
      <div className="flex items-center justify-between px-2 py-1 text-[10px] text-ink-muted">
        <span>Price (USD)</span>
        <span>Qty</span>
      </div>

      {/* Asks — reversed so the lowest ask is nearest the mid-price row */}
      <ul className="flex-1 overflow-hidden">
        {book
          ? [...book.asks].reverse().map((level, i) => (
              <DepthRow key={i} level={level} maxQty={maxQty} side="ask" />
            ))
          : Array.from({ length: 10 }, (_, i) => skeletonRow(i))}
      </ul>

      {/* Mid-price / spread row */}
      <div className="border-y border-line bg-elevated px-2 py-1.5 text-center text-xs font-bold tabular-nums">
        {book ? (
          <>
            <span className="text-ink">{formatPrice(currentPrice)}</span>
            {spreadPct && (
              <span className="ml-2 text-[10px] font-normal text-ink-muted">
                spread {spreadPct}%
              </span>
            )}
          </>
        ) : (
          <div className="mx-auto h-3 w-24 skeleton rounded" />
        )}
      </div>

      {/* Bids */}
      <ul className="flex-1 overflow-hidden">
        {book
          ? book.bids.map((level, i) => (
              <DepthRow key={i} level={level} maxQty={maxQty} side="bid" />
            ))
          : Array.from({ length: 10 }, (_, i) => skeletonRow(i + 10))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/trading/OrderBook.tsx
git commit -m "feat: add OrderBook component (Binance live depth + simulated fallback)"
```

---

## Task 5: TradeForm Component

**Files:**
- Create: `src/components/trading/TradeForm.tsx`

- [ ] **Step 1: Create `src/components/trading/TradeForm.tsx`**

```typescript
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";
import { formatPrice } from "../../lib/format";
import type { PaperWallet, PaperOrder, NewOrder, Position } from "../../lib/paperTrading";
import type { Asset } from "../../types";

interface Props {
  asset: Asset;
  currentPrice: number;
  wallet: PaperWallet | null;
  positions: Position[];
  onPlaceOrder: (order: NewOrder) => Promise<PaperOrder>;
  userId: string | undefined;
}

type Side = "buy" | "sell";
type OrderType = "limit" | "market" | "stop-limit";
const LEVERAGE_OPTIONS = [2, 5, 10] as const;
const PCT_OPTIONS = [25, 50, 75, 100] as const;

export function TradeForm({ asset, currentPrice, wallet, positions, onPlaceOrder, userId }: Props) {
  const navigate = useNavigate();
  const [side, setSide] = useState<Side>("buy");
  const [orderType, setOrderType] = useState<OrderType>("limit");
  const [price, setPrice] = useState(() => (currentPrice > 0 ? currentPrice.toFixed(2) : ""));
  const [stopPrice, setStopPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState("");
  const [tpEnabled, setTpEnabled] = useState(false);
  const [tpPrice, setTpPrice] = useState("");
  const [slEnabled, setSlEnabled] = useState(false);
  const [slPrice, setSlPrice] = useState("");
  const [marginEnabled, setMarginEnabled] = useState(false);
  const [leverage, setLeverage] = useState(2);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Keep limit price field in sync when asset changes; market orders always use live price
  useEffect(() => {
    if (orderType === "market" && currentPrice > 0) {
      setPrice(currentPrice.toFixed(2));
    }
  }, [currentPrice, orderType]);

  const effectivePrice = orderType === "market" ? currentPrice : parseFloat(price) || 0;
  const effectiveLeverage = asset.type === "crypto" && marginEnabled ? leverage : 1;
  const balance = wallet?.balance_usd ?? 0;
  const position = positions.find((p) => p.asset_id === asset.id);
  const heldQty = position?.quantity ?? 0;

  const updateFromPrice = (p: string) => {
    setPrice(p);
    const pNum = parseFloat(p);
    const aNum = parseFloat(amount);
    if (pNum > 0 && aNum > 0) setTotal((pNum * aNum).toFixed(2));
  };

  const updateFromAmount = (a: string) => {
    setAmount(a);
    const aNum = parseFloat(a);
    if (effectivePrice > 0 && aNum > 0) setTotal((effectivePrice * aNum).toFixed(2));
  };

  const updateFromTotal = (t: string) => {
    setTotal(t);
    const tNum = parseFloat(t);
    if (effectivePrice > 0 && tNum > 0) setAmount((tNum / effectivePrice).toFixed(6));
  };

  const applyPct = useCallback((pct: number) => {
    if (side === "buy") {
      const totalVal = balance * effectiveLeverage * (pct / 100);
      setTotal(totalVal.toFixed(2));
      if (effectivePrice > 0) setAmount((totalVal / effectivePrice).toFixed(6));
    } else {
      const qty = heldQty * (pct / 100);
      setAmount(qty.toFixed(6));
      if (effectivePrice > 0) setTotal((qty * effectivePrice).toFixed(2));
    }
  }, [side, balance, effectiveLeverage, effectivePrice, heldQty]);

  const amountNum = parseFloat(amount) || 0;
  const totalNum = parseFloat(total) || 0;
  const requiredBalance = effectiveLeverage > 0 ? totalNum / effectiveLeverage : totalNum;
  const isInsufficientBalance = side === "buy" && requiredBalance > balance;
  const isExceedsPosition = side === "sell" && amountNum > heldQty;
  const isInvalid = amountNum <= 0 || isInsufficientBalance || isExceedsPosition || !userId;

  const handleConfirm = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      await onPlaceOrder({
        user_id: userId,
        asset_id: asset.id,
        asset_type: asset.type as "crypto" | "stock",
        asset_symbol: asset.symbol,
        asset_name: asset.name,
        side,
        order_type: orderType,
        quantity: amountNum,
        price: orderType !== "market" ? (parseFloat(price) || null) : null,
        stop_price: orderType === "stop-limit" ? (parseFloat(stopPrice) || null) : null,
        tp_price: tpEnabled ? (parseFloat(tpPrice) || null) : null,
        sl_price: slEnabled ? (parseFloat(slPrice) || null) : null,
        leverage: effectiveLeverage,
      });
      setShowConfirm(false);
      setAmount("");
      setTotal("");
      setToast({ type: "success", msg: `${side === "buy" ? "Buy" : "Sell"} order placed!` });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setToast({ type: "error", msg: e instanceof Error ? e.message : "Failed to place order" });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const fmtBalance = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Trade {asset.symbol}
        </h3>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {/* Toast notification */}
        {toast && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              toast.type === "success" ? "bg-up/15 text-up" : "bg-down/15 text-down"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {toast.msg}
          </div>
        )}

        {/* Unauthenticated nudge */}
        {!userId && (
          <div className="rounded-lg bg-elevated px-3 py-2 text-center text-sm text-ink-muted">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-semibold text-brand hover:underline"
            >
              Sign in
            </button>{" "}
            to trade
          </div>
        )}

        {/* Buy / Sell tabs */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-elevated p-1">
          {(["buy", "sell"] as Side[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`rounded-md py-1.5 text-sm font-bold capitalize transition-colors ${
                side === s
                  ? s === "buy"
                    ? "bg-up text-white"
                    : "bg-down text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Order type picker */}
        <div className="flex gap-1">
          {(["limit", "market", "stop-limit"] as OrderType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOrderType(t)}
              className={`flex-1 rounded-md border py-1 text-xs font-semibold capitalize transition-colors ${
                orderType === t
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-line text-ink-muted hover:border-brand/50 hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Limit price input */}
        {orderType !== "market" && (
          <div>
            <label className="mb-1 block text-xs text-ink-muted">Price (USD)</label>
            <input
              type="number"
              step="any"
              value={price}
              onChange={(e) => updateFromPrice(e.target.value)}
              className="w-full rounded-md border border-line bg-elevated px-3 py-2 text-sm tabular-nums text-ink focus:border-brand focus:outline-none"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Market price display */}
        {orderType === "market" && (
          <div className="rounded-md bg-elevated px-3 py-2 text-xs text-ink-muted">
            Market price:{" "}
            <span className="font-semibold tabular-nums text-ink">{formatPrice(currentPrice)}</span>
          </div>
        )}

        {/* Stop price input (stop-limit only) */}
        {orderType === "stop-limit" && (
          <div>
            <label className="mb-1 block text-xs text-ink-muted">Stop Price (USD)</label>
            <input
              type="number"
              step="any"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              className="w-full rounded-md border border-line bg-elevated px-3 py-2 text-sm tabular-nums text-ink focus:border-brand focus:outline-none"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="mb-1 block text-xs text-ink-muted">Amount ({asset.symbol})</label>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => updateFromAmount(e.target.value)}
            className="w-full rounded-md border border-line bg-elevated px-3 py-2 text-sm tabular-nums text-ink focus:border-brand focus:outline-none"
            placeholder="0.00"
          />
        </div>

        {/* % fill buttons */}
        <div className="flex gap-1">
          {PCT_OPTIONS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => applyPct(pct)}
              className="flex-1 rounded border border-line py-1 text-xs text-ink-muted transition-colors hover:border-brand hover:text-brand"
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Total */}
        <div>
          <label className="mb-1 block text-xs text-ink-muted">Total (USD)</label>
          <input
            type="number"
            step="any"
            value={total}
            onChange={(e) => updateFromTotal(e.target.value)}
            className="w-full rounded-md border border-line bg-elevated px-3 py-2 text-sm tabular-nums text-ink focus:border-brand focus:outline-none"
            placeholder="0.00"
          />
        </div>

        {/* Available balance / position */}
        <div className="flex justify-between text-xs text-ink-muted">
          <span>Available</span>
          <span className="tabular-nums">
            {side === "buy"
              ? `$${fmtBalance(balance * effectiveLeverage)}`
              : `${heldQty.toFixed(6)} ${asset.symbol}`}
          </span>
        </div>

        {/* TP / SL section */}
        <div className="rounded-lg border border-line">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold text-ink-muted">TP / SL</span>
            <div className="flex gap-3">
              <label className="flex cursor-pointer items-center gap-1">
                <input
                  type="checkbox"
                  checked={tpEnabled}
                  onChange={(e) => setTpEnabled(e.target.checked)}
                  className="accent-brand"
                />
                <span className="text-xs text-ink-muted">TP</span>
              </label>
              <label className="flex cursor-pointer items-center gap-1">
                <input
                  type="checkbox"
                  checked={slEnabled}
                  onChange={(e) => setSlEnabled(e.target.checked)}
                  className="accent-brand"
                />
                <span className="text-xs text-ink-muted">SL</span>
              </label>
            </div>
          </div>
          {(tpEnabled || slEnabled) && (
            <div className="space-y-2 border-t border-line p-3">
              {tpEnabled && (
                <div>
                  <label className="mb-1 block text-xs text-ink-muted">Take Profit (USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={tpPrice}
                    onChange={(e) => setTpPrice(e.target.value)}
                    className="w-full rounded-md border border-line bg-elevated px-3 py-2 text-sm tabular-nums text-ink focus:border-brand focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              )}
              {slEnabled && (
                <div>
                  <label className="mb-1 block text-xs text-ink-muted">Stop Loss (USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={slPrice}
                    onChange={(e) => setSlPrice(e.target.value)}
                    className="w-full rounded-md border border-line bg-elevated px-3 py-2 text-sm tabular-nums text-ink focus:border-brand focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Margin toggle (crypto only) */}
        {asset.type === "crypto" && (
          <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
            <span className="text-xs font-semibold text-ink-muted">Margin</span>
            <div className="flex items-center gap-2">
              {marginEnabled && (
                <div className="flex gap-1">
                  {LEVERAGE_OPTIONS.map((lev) => (
                    <button
                      key={lev}
                      type="button"
                      onClick={() => setLeverage(lev)}
                      className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                        leverage === lev
                          ? "bg-brand text-white"
                          : "bg-elevated text-ink-muted hover:text-ink"
                      }`}
                    >
                      {lev}×
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={marginEnabled}
                onClick={() => setMarginEnabled(!marginEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  marginEnabled ? "bg-brand" : "border border-line bg-elevated"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    marginEnabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Validation errors */}
        {isInsufficientBalance && (
          <p className="text-xs text-down">Insufficient funds</p>
        )}
        {isExceedsPosition && (
          <p className="text-xs text-down">
            Exceeds position ({heldQty.toFixed(6)} {asset.symbol})
          </p>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={() => {
            if (!userId) { navigate("/login"); return; }
            setShowConfirm(true);
          }}
          disabled={isInvalid}
          className={`w-full rounded-lg py-3 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            side === "buy" ? "bg-up hover:bg-up/80" : "bg-down hover:bg-down/80"
          }`}
        >
          {!userId
            ? "Sign in to Trade"
            : `${side === "buy" ? "Buy" : "Sell"} ${asset.symbol}`}
        </button>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm">
          <div className="card mx-4 w-full max-w-sm p-5">
            <h3 className="mb-3 text-base font-bold">
              Confirm {side === "buy" ? "Buy" : "Sell"}
            </h3>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Asset</dt>
                <dd className="font-semibold">{asset.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Order type</dt>
                <dd className="capitalize">{orderType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Amount</dt>
                <dd className="tabular-nums">
                  {amountNum.toFixed(6)} {asset.symbol}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Est. total</dt>
                <dd className="font-semibold tabular-nums">
                  ${fmtBalance(totalNum)}
                </dd>
              </div>
              {effectiveLeverage > 1 && (
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Leverage</dt>
                  <dd className="font-semibold text-brand">{effectiveLeverage}×</dd>
                </div>
              )}
            </dl>
            <p className="mt-3 text-[10px] text-ink-muted">
              Paper trading only — no real money is used.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-line py-2 text-sm font-semibold transition-colors hover:border-brand"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={submitting}
                className={`flex-1 rounded-lg py-2 text-sm font-bold text-white transition-colors disabled:opacity-50 ${
                  side === "buy" ? "bg-up hover:bg-up/80" : "bg-down hover:bg-down/80"
                }`}
              >
                {submitting ? "Placing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/trading/TradeForm.tsx
git commit -m "feat: add TradeForm component (limit/market/stop-limit + TP/SL + margin)"
```

---

## Task 6: TradingPanel + AssetDetail Integration

**Files:**
- Create: `src/components/trading/TradingPanel.tsx`
- Modify: `src/pages/AssetDetail.tsx` (2 lines — one import, one JSX render)

- [ ] **Step 1: Create `src/components/trading/TradingPanel.tsx`**

```typescript
import { useAuth } from "../../context/AuthContext";
import { usePaperWallet } from "../../hooks/usePaperWallet";
import { usePaperOrders } from "../../hooks/usePaperOrders";
import { OrderBook } from "./OrderBook";
import { TradeForm } from "./TradeForm";
import type { Asset } from "../../types";

interface Props {
  asset: Asset;
  currentPrice: number;
}

export function TradingPanel({ asset, currentPrice }: Props) {
  const { user } = useAuth();
  const { wallet, refresh: refreshWallet } = usePaperWallet(user?.id);
  const { orders, positions, placeOrder, cancelOrder } = usePaperOrders(
    user?.id,
    currentPrice,
    refreshWallet,
  );

  const pendingForAsset = orders.filter(
    (o) => o.asset_id === asset.id && o.status === "pending",
  );

  return (
    <section aria-label="Paper Trading" className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
        Trade
      </h2>
      <div className="card overflow-hidden">
        <div className="grid min-h-[540px] grid-cols-1 lg:grid-cols-[280px_1fr]">
          {/* Left: Order Book */}
          <div className="border-b border-line lg:border-b-0 lg:border-r">
            <OrderBook
              assetType={asset.type as "crypto" | "stock"}
              symbol={asset.symbol}
              currentPrice={currentPrice}
            />
          </div>

          {/* Right: Trade Form + open orders */}
          <div className="flex flex-col">
            <div className="flex-1">
              <TradeForm
                asset={asset}
                currentPrice={currentPrice}
                wallet={wallet}
                positions={positions}
                onPlaceOrder={placeOrder}
                userId={user?.id}
              />
            </div>

            {/* Open orders for this asset */}
            {pendingForAsset.length > 0 && (
              <div className="border-t border-line p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Open Orders
                </h4>
                <ul className="space-y-1.5">
                  {pendingForAsset.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`font-bold uppercase ${
                          o.side === "buy" ? "text-up" : "text-down"
                        }`}
                      >
                        {o.side}
                      </span>
                      <span className="capitalize text-ink-muted">{o.order_type}</span>
                      <span className="tabular-nums">
                        {o.quantity.toFixed(6)} {asset.symbol}
                      </span>
                      <span className="tabular-nums text-ink-muted">
                        @ {o.price != null ? `$${o.price.toLocaleString()}` : "Market"}
                      </span>
                      <button
                        type="button"
                        onClick={() => void cancelOrder(o.id)}
                        className="text-down hover:underline"
                      >
                        Cancel
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add import to `src/pages/AssetDetail.tsx`**

Find the existing import block (around line 54, near the `ErrorState` import). Add one line after the last import:

```typescript
import { TradingPanel } from "../components/trading/TradingPanel";
```

- [ ] **Step 3: Render TradingPanel in AssetDetail**

In `AssetDetail.tsx`, find the closing `</>` of the `asset && <>…</>` fragment (line 514). The fragment ends with:
```tsx
          {!isCrypto && (
            <AboutStock profile={stockProfile.data ?? undefined} loading={stockProfile.loading} asset={asset} />
          )}
        </>
```

Add `<TradingPanel>` immediately before `</>`:

```tsx
          {!isCrypto && (
            <AboutStock profile={stockProfile.data ?? undefined} loading={stockProfile.loading} asset={asset} />
          )}
          <TradingPanel asset={asset} currentPrice={displayPrice} />
        </>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Start dev server and verify manually**

```bash
npm run dev
```

Navigate to any crypto asset page (e.g. `/asset/crypto/bitcoin`). Verify:
- Order book appears below the About section with red asks and green bids
- The depth bar widths vary per row
- Spread row shows current price in the middle
- Buy/Sell tabs switch correctly
- Changing limit price updates the Total field automatically
- Changing Amount updates Total
- Changing Total updates Amount
- Clicking 25/50/75/100% populates Amount and Total from balance
- TP/SL checkboxes expand/collapse their price inputs
- Margin toggle (crypto) shows the 2×/5×/10× selector
- Stop-Limit order type shows a Stop Price input
- Market order type hides the Price input and shows the live price badge
- Clicking Buy with no sign-in shows "Sign in to Trade" button that navigates to /login
- When signed in: submit → confirm dialog → confirm → success toast

Navigate to a stock asset page (e.g. `/asset/stock/AAPL`). Verify:
- Order book shows "Simulated" badge in the header
- Order book quantities jitter every 2 seconds
- Margin toggle does not appear (stocks don't support it)

- [ ] **Step 6: Commit**

```bash
git add src/components/trading/TradingPanel.tsx src/pages/AssetDetail.tsx
git commit -m "feat: integrate TradingPanel into AssetDetail page"
```

---

## Task 7: Wallet Page + Routing + Nav

**Files:**
- Create: `src/pages/Wallet.tsx`
- Modify: `src/App.tsx` (add `/wallet` route)
- Modify: `src/components/layout/navItems.ts` (add Wallet item)

- [ ] **Step 1: Create `src/pages/Wallet.tsx`**

```typescript
import { useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Plus, Clock, TrendingUp, PiggyBank } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePaperWallet } from "../hooks/usePaperWallet";
import { usePaperOrders } from "../hooks/usePaperOrders";
import { PageHeader } from "../components/ui/PageHeader";
import { formatPrice } from "../lib/format";
import type { PaperOrder, Position } from "../lib/paperTrading";

// ─── Add Funds Modal ──────────────────────────────────────────────────────────

const PAYMENT_METHODS = ["Credit Card", "PayPal", "GCash", "PayMaya"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];
const PRESET_AMOUNTS = [100, 500, 1000, 5000, 10000] as const;

function AddFundsModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (amount: number) => Promise<void>;
}) {
  const [method, setMethod] = useState<PaymentMethod>("Credit Card");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const parsedAmount = parseFloat(amount);
  const isValid = !Number.isNaN(parsedAmount) && parsedAmount >= 10 && parsedAmount <= 100000;

  const handleAdd = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await onAdd(parsedAmount);
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm">
        <div className="card mx-4 w-full max-w-sm p-6 text-center">
          <PiggyBank className="mx-auto mb-3 h-10 w-10 text-up" aria-hidden="true" />
          <p className="text-lg font-bold">Funds Added!</p>
          <p className="mt-1 text-sm text-ink-muted">
            ${parsedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} added to your
            paper wallet.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-lg bg-brand py-2 font-semibold text-white hover:bg-brand/80 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm">
      <div className="card mx-4 w-full max-w-sm p-5">
        <h3 className="mb-4 text-base font-bold">Add Funds</h3>

        {/* Payment method selector */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                method === m
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-line text-ink-muted hover:border-brand/50"
              }`}
            >
              <CreditCard className="h-3 w-3" aria-hidden="true" />
              {m}
            </button>
          ))}
        </div>

        {/* Preset amounts */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRESET_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAmount(String(a))}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                amount === String(a)
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-line text-ink-muted hover:border-brand/50"
              }`}
            >
              ${a.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mb-4">
          <label className="mb-1 block text-xs text-ink-muted">Amount (USD)</label>
          <input
            type="number"
            step="any"
            min={10}
            max={100000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border border-line bg-elevated px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
            placeholder="0.00"
          />
          {amount && !isValid && (
            <p className="mt-1 text-xs text-down">Enter $10 – $100,000</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-line py-2 text-sm font-semibold transition-colors hover:border-brand"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={loading || !isValid}
            className="flex-1 rounded-lg bg-brand py-2 text-sm font-bold text-white transition-colors hover:bg-brand/80 disabled:opacity-50"
          >
            {loading ? "Adding…" : `Add via ${method}`}
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] text-ink-muted">
          Paper trading only — no real money is transferred.
        </p>
      </div>
    </div>
  );
}

// ─── Table rows ───────────────────────────────────────────────────────────────

function OrderRow({ order }: { order: PaperOrder }) {
  const statusColor =
    order.status === "filled"
      ? "text-up"
      : order.status === "cancelled"
        ? "text-ink-muted"
        : "text-yellow-400";

  return (
    <tr className="border-b border-line text-sm">
      <td className="py-2 pr-3 text-xs text-ink-muted tabular-nums">
        {new Date(order.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </td>
      <td className="py-2 pr-3 font-semibold">{order.asset_symbol}</td>
      <td className={`py-2 pr-3 font-bold uppercase ${order.side === "buy" ? "text-up" : "text-down"}`}>
        {order.side}
      </td>
      <td className="py-2 pr-3 capitalize text-ink-muted">{order.order_type}</td>
      <td className="py-2 pr-3 tabular-nums">{order.quantity.toFixed(6)}</td>
      <td className="py-2 pr-3 tabular-nums text-ink-muted">
        {order.filled_price != null
          ? `$${order.filled_price.toLocaleString()}`
          : order.price != null
            ? `$${order.price.toLocaleString()}`
            : "—"}
      </td>
      <td className={`py-2 font-semibold capitalize ${statusColor}`}>{order.status}</td>
    </tr>
  );
}

function PositionRow({ position }: { position: Position }) {
  return (
    <tr className="border-b border-line text-sm">
      <td className="py-2 pr-3 font-semibold">{position.asset_symbol}</td>
      <td className="py-2 pr-3 capitalize text-ink-muted">{position.asset_type}</td>
      <td className="py-2 pr-3 tabular-nums">{position.quantity.toFixed(6)}</td>
      <td className="py-2 tabular-nums text-ink-muted">{formatPrice(position.avg_cost)}</td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ORDER_FILTERS = ["all", "filled", "pending", "cancelled"] as const;
type OrderFilter = (typeof ORDER_FILTERS)[number];

export function Wallet() {
  const { user } = useAuth();
  const { wallet, loading: walletLoading, addFunds } = usePaperWallet(user?.id);
  const { orders, positions, loading: ordersLoading } = usePaperOrders(user?.id, 0);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [filter, setFilter] = useState<OrderFilter>("all");

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  if (!user) {
    return (
      <div className="py-16 text-center">
        <PiggyBank className="mx-auto mb-4 h-12 w-12 text-ink-muted" aria-hidden="true" />
        <p className="text-lg font-bold">Sign in to access your wallet</p>
        <Link to="/login" className="mt-3 inline-block text-brand hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Paper Wallet" subtitle="Simulated trading balance and history" />

      {/* Balance + positions summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">USD Balance</p>
              {walletLoading ? (
                <div className="mt-2 h-8 w-36 skeleton rounded" />
              ) : (
                <p className="mt-1 text-3xl font-extrabold tabular-nums">
                  $
                  {(wallet?.balance_usd ?? 10000).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowAddFunds(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/80"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Funds
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-muted">Starting balance: $10,000 paper money</p>
        </div>

        <div className="card p-5">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Open Positions</p>
          <p className="mt-1 text-3xl font-extrabold">{positions.length}</p>
          <p className="mt-3 text-xs text-ink-muted">
            Active holdings across all assets
          </p>
        </div>
      </div>

      {/* Holdings table */}
      {positions.length > 0 && (
        <div className="card mb-6 p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Holdings</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th className="pb-2 pr-3 font-semibold">Symbol</th>
                  <th className="pb-2 pr-3 font-semibold">Type</th>
                  <th className="pb-2 pr-3 font-semibold">Quantity</th>
                  <th className="pb-2 font-semibold">Avg Cost</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <PositionRow key={p.asset_id} position={p} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order history */}
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Order History</h2>
          </div>
          <div className="flex gap-1">
            {ORDER_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                  filter === f
                    ? "bg-elevated text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {ordersLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-8 skeleton rounded" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            No orders yet.{" "}
            <Link to="/markets/crypto" className="text-brand hover:underline">
              Start trading
            </Link>{" "}
            on any asset page.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-ink-muted">
                  <th className="pb-2 pr-3 font-semibold">Time</th>
                  <th className="pb-2 pr-3 font-semibold">Asset</th>
                  <th className="pb-2 pr-3 font-semibold">Side</th>
                  <th className="pb-2 pr-3 font-semibold">Type</th>
                  <th className="pb-2 pr-3 font-semibold">Qty</th>
                  <th className="pb-2 pr-3 font-semibold">Price</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddFunds && (
        <AddFundsModal
          onClose={() => setShowAddFunds(false)}
          onAdd={async (amount) => {
            await addFunds(amount);
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add `/wallet` route to `src/App.tsx`**

Add the import near the other page imports:
```typescript
import { Wallet } from "./pages/Wallet";
```

Add the protected route inside `<Routes>`, after the `/portfolio` route and before `/login`:
```tsx
            <Route
              path="/wallet"
              element={
                <AuthGuard>
                  <Wallet />
                </AuthGuard>
              }
            />
```

- [ ] **Step 3: Add Wallet to nav in `src/components/layout/navItems.ts`**

Replace the entire file with (note: `PiggyBank` replaces the `Wallet` icon alias conflict — the existing `Wallet` icon is already used for Portfolio):

```typescript
import {
  LayoutDashboard,
  Bitcoin,
  LineChart,
  Star,
  Wallet,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Requires authentication to be useful. */
  protected?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/markets/crypto", label: "Crypto", icon: Bitcoin },
  { to: "/markets/stocks", label: "Stocks", icon: LineChart },
  { to: "/watchlist", label: "Watchlist", icon: Star, protected: true },
  { to: "/portfolio", label: "Portfolio", icon: Wallet, protected: true },
  { to: "/wallet", label: "Wallet", icon: PiggyBank, protected: true },
];
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run all tests to confirm nothing broke**

```bash
npx vitest run
```

Expected: all existing tests PASS plus the 7 new `paperTrading.test.ts` tests PASS.

- [ ] **Step 6: Start dev server and verify end-to-end**

```bash
npm run dev
```

**Wallet page checks:**
- `/wallet` appears in the sidebar nav with a PiggyBank icon
- Navigating to `/wallet` without sign-in redirects to `/login` (AuthGuard)
- After sign-in, balance card shows $10,000 (first visit creates the wallet row)
- "Add Funds" button opens the modal; picking a payment method and confirming updates the balance
- Preset amounts ($100, $500…) populate the input when clicked
- After placing a trade from an asset page, the order appears in Order History
- Filter buttons (all / filled / pending / cancelled) correctly filter the table
- After a market order, the position appears in the Holdings table

- [ ] **Step 7: Commit**

```bash
git add src/pages/Wallet.tsx src/App.tsx src/components/layout/navItems.ts
git commit -m "feat: add Wallet page with balance card, add-funds modal, and order history"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `paper_wallet` + `paper_orders` Supabase tables with RLS — Task 1
- ✅ Inline panel below AssetDetail content — Tasks 4–6
- ✅ Order book: Binance live stream for crypto, simulated for stocks — Tasks 2 + 4
- ✅ Limit / Market / Stop-Limit order types — Task 5
- ✅ Auto-compute: price↔amount↔total — Task 5
- ✅ 25/50/75/100% slider — Task 5
- ✅ TP / SL toggle with price inputs — Task 5
- ✅ Margin toggle + 2×/5×/10× leverage (crypto only) — Task 5
- ✅ Confirm dialog before order submission — Task 5
- ✅ Background fill checker (5 s polling) for pending orders — Task 3
- ✅ Market orders fill immediately — Task 3
- ✅ Wallet page: balance, add funds, holdings, order history — Task 7
- ✅ Wallet in sidebar nav — Task 7
- ✅ Works for both stocks and crypto — throughout

**Placeholder scan:** None found.

**Type consistency:**
- `PaperOrder`, `NewOrder`, `Position` defined in Task 1, imported identically in Tasks 3–7
- `DepthLevel`, `DepthBook` defined in Task 2, imported in Task 4
- `usePaperWallet` / `usePaperOrders` return shapes defined in Task 3, consumed in Tasks 6–7
- `fillOrder(orderId, filledPrice, side, quantity, leverage, userId)` signature defined once in Task 1, called with same arg order in Task 3
