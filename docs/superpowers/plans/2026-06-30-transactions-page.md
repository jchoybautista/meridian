# Transactions Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/transactions` page showing the user's paper trading history with dummy seed data, and update the dashboard's "Latest Transactions" panel to link there instead of external mempool.space URLs.

**Architecture:** Four file changes only — add a nav item, register the route, create the page component (with inline dummy data, filter state, and table/card layout), then patch the dashboard panel. No new hooks, no API calls, no backend changes.

**Tech Stack:** React 18, TypeScript, React Router v6, Tailwind CSS (project token set), lucide-react icons.

---

## Global Constraints

- Dark theme only — use existing Tailwind tokens: `bg-base`, `bg-card`, `bg-elevated`, `border-line`, `text-ink`, `text-ink-muted`, `text-brand`, `text-up` (#22C55E), `text-down` (#EF4444).
- Brand accent: `#6366F1` via `text-brand` / `bg-brand`.
- Follow WCAG 2.1 AA: every interactive element keyboard-accessible, colour never the sole indicator, `aria-label` on icon-only buttons.
- Reuse existing components: `PageHeader`, `EmptyState`, `AssetIcon` — do not create duplicates.
- No pagination, no sorting, no URL params — local state only.
- No new npm packages.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/layout/navItems.ts` | Modify | Add Transactions nav entry |
| `src/App.tsx` | Modify | Register `/transactions` auth-protected route |
| `src/pages/Transactions.tsx` | Create | Full page: dummy data, filters, table, mobile cards |
| `src/components/dashboard/LatestTransactions.tsx` | Modify | Remove external links; add "View all" footer link |

---

## Task 1: Add Transactions to the Navigation

**Files:**
- Modify: `src/components/layout/navItems.ts`

**Interfaces:**
- Produces: `NAV_ITEMS` array entry `{ to: "/transactions", label: "Transactions", icon: Receipt, protected: true }` — consumed by Sidebar and BottomNav which already iterate `NAV_ITEMS`.

- [ ] **Step 1: Open `src/components/layout/navItems.ts` and add the `Receipt` import + nav entry**

Replace the file content with:

```ts
import {
  LayoutDashboard,
  Bitcoin,
  LineChart,
  Star,
  Wallet,
  PiggyBank,
  Receipt,
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
  { to: "/transactions", label: "Transactions", icon: Receipt, protected: true },
];
```

- [ ] **Step 2: Verify the dev server picks up the change**

Run: `npm run dev` (if not already running)

Open the app. The Sidebar and BottomNav should now show a "Transactions" item with a receipt icon. Clicking it will 404 until the route is added in Task 2 — that is expected.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/navItems.ts
git commit -m "feat: add Transactions nav item"
```

---

## Task 2: Register the Route in App.tsx

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `Transactions` default export from `../pages/Transactions` (created in Task 3 — add the import now, it will resolve once Task 3 is done).
- Produces: `/transactions` route wrapped in `AuthGuard`, matching the pattern of `/watchlist`, `/portfolio`, `/wallet`.

- [ ] **Step 1: Add the import and route to `src/App.tsx`**

```tsx
import { Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { BottomNav } from "./components/layout/BottomNav";
import { AuthGuard } from "./components/auth/AuthGuard";
import { Dashboard } from "./pages/Dashboard";
import { MarketsCrypto } from "./pages/MarketsCrypto";
import { MarketsStocks } from "./pages/MarketsStocks";
import { AssetDetail } from "./pages/AssetDetail";
import { Watchlist } from "./pages/Watchlist";
import { Portfolio } from "./pages/Portfolio";
import { Wallet } from "./pages/Wallet";
import { Transactions } from "./pages/Transactions";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { NotFound } from "./pages/NotFound";

export default function App() {
  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only skip-link">
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main
          id="main"
          className="w-full flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10"
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/markets/crypto" element={<MarketsCrypto />} />
            <Route path="/markets/stocks" element={<MarketsStocks />} />
            <Route path="/asset/:type/:id" element={<AssetDetail />} />
            <Route
              path="/watchlist"
              element={
                <AuthGuard>
                  <Watchlist />
                </AuthGuard>
              }
            />
            <Route
              path="/portfolio"
              element={
                <AuthGuard>
                  <Portfolio />
                </AuthGuard>
              }
            />
            <Route
              path="/wallet"
              element={
                <AuthGuard>
                  <Wallet />
                </AuthGuard>
              }
            />
            <Route
              path="/transactions"
              element={
                <AuthGuard>
                  <Transactions />
                </AuthGuard>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register /transactions route"
```

---

## Task 3: Create the Transactions Page

**Files:**
- Create: `src/pages/Transactions.tsx`

**Interfaces:**
- Consumes: `PageHeader` from `../components/ui/PageHeader`, `EmptyState` from `../components/ui/States`, `AssetIcon` from `../components/ui/AssetIcon`, `formatPrice` and `formatNumber` from `../lib/format`.
- Produces: named export `Transactions` — consumed by `App.tsx`.

- [ ] **Step 1: Create `src/pages/Transactions.tsx` with the full implementation**

```tsx
import { useMemo, useState } from "react";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState } from "../components/ui/States";
import { AssetIcon } from "../components/ui/AssetIcon";
import { formatPrice, formatNumber } from "../lib/format";

type TxStatus = "completed" | "pending" | "cancelled";
type TxSide = "buy" | "sell";
type TxOrderType = "market" | "limit" | "stop-limit";
type AssetType = "crypto" | "stock";

interface DisplayTx {
  id: string;
  asset_symbol: string;
  asset_name: string;
  asset_type: AssetType;
  asset_image?: string;
  side: TxSide;
  order_type: TxOrderType;
  quantity: number;
  price: number;
  status: TxStatus;
  created_at: string;
}

const DUMMY_TRANSACTIONS: DisplayTx[] = [
  {
    id: "tx-001",
    asset_symbol: "BTC",
    asset_name: "Bitcoin",
    asset_type: "crypto",
    asset_image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    side: "buy",
    order_type: "market",
    quantity: 0.05,
    price: 67420.0,
    status: "completed",
    created_at: "2026-06-28T14:23:00Z",
  },
  {
    id: "tx-002",
    asset_symbol: "ETH",
    asset_name: "Ethereum",
    asset_type: "crypto",
    asset_image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    side: "buy",
    order_type: "limit",
    quantity: 1.2,
    price: 3510.5,
    status: "completed",
    created_at: "2026-06-27T09:45:00Z",
  },
  {
    id: "tx-003",
    asset_symbol: "AAPL",
    asset_name: "Apple Inc.",
    asset_type: "stock",
    side: "buy",
    order_type: "market",
    quantity: 10,
    price: 213.75,
    status: "completed",
    created_at: "2026-06-26T15:30:00Z",
  },
  {
    id: "tx-004",
    asset_symbol: "SOL",
    asset_name: "Solana",
    asset_type: "crypto",
    asset_image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    side: "sell",
    order_type: "limit",
    quantity: 25,
    price: 178.3,
    status: "completed",
    created_at: "2026-06-25T11:10:00Z",
  },
  {
    id: "tx-005",
    asset_symbol: "TSLA",
    asset_name: "Tesla Inc.",
    asset_type: "stock",
    side: "sell",
    order_type: "stop-limit",
    quantity: 5,
    price: 248.9,
    status: "completed",
    created_at: "2026-06-24T16:55:00Z",
  },
  {
    id: "tx-006",
    asset_symbol: "BNB",
    asset_name: "BNB",
    asset_type: "crypto",
    asset_image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    side: "buy",
    order_type: "market",
    quantity: 3.5,
    price: 612.0,
    status: "pending",
    created_at: "2026-06-23T08:20:00Z",
  },
  {
    id: "tx-007",
    asset_symbol: "MSFT",
    asset_name: "Microsoft Corp.",
    asset_type: "stock",
    side: "buy",
    order_type: "limit",
    quantity: 8,
    price: 415.5,
    status: "pending",
    created_at: "2026-06-22T13:40:00Z",
  },
  {
    id: "tx-008",
    asset_symbol: "ADA",
    asset_name: "Cardano",
    asset_type: "crypto",
    asset_image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    side: "buy",
    order_type: "limit",
    quantity: 500,
    price: 0.485,
    status: "cancelled",
    created_at: "2026-06-21T10:05:00Z",
  },
  {
    id: "tx-009",
    asset_symbol: "NVDA",
    asset_name: "NVIDIA Corp.",
    asset_type: "stock",
    side: "buy",
    order_type: "market",
    quantity: 3,
    price: 1102.0,
    status: "completed",
    created_at: "2026-06-20T14:15:00Z",
  },
  {
    id: "tx-010",
    asset_symbol: "ETH",
    asset_name: "Ethereum",
    asset_type: "crypto",
    asset_image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    side: "sell",
    order_type: "market",
    quantity: 0.8,
    price: 3480.0,
    status: "completed",
    created_at: "2026-06-19T09:30:00Z",
  },
  {
    id: "tx-011",
    asset_symbol: "XRP",
    asset_name: "XRP",
    asset_type: "crypto",
    asset_image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    side: "buy",
    order_type: "market",
    quantity: 1000,
    price: 0.612,
    status: "completed",
    created_at: "2026-06-18T11:50:00Z",
  },
  {
    id: "tx-012",
    asset_symbol: "GOOGL",
    asset_name: "Alphabet Inc.",
    asset_type: "stock",
    side: "sell",
    order_type: "limit",
    quantity: 2,
    price: 178.4,
    status: "cancelled",
    created_at: "2026-06-17T15:20:00Z",
  },
  {
    id: "tx-013",
    asset_symbol: "BTC",
    asset_name: "Bitcoin",
    asset_type: "crypto",
    asset_image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    side: "sell",
    order_type: "stop-limit",
    quantity: 0.02,
    price: 66800.0,
    status: "completed",
    created_at: "2026-06-16T10:00:00Z",
  },
  {
    id: "tx-014",
    asset_symbol: "DOGE",
    asset_name: "Dogecoin",
    asset_type: "crypto",
    asset_image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
    side: "buy",
    order_type: "market",
    quantity: 2000,
    price: 0.175,
    status: "pending",
    created_at: "2026-06-15T08:45:00Z",
  },
  {
    id: "tx-015",
    asset_symbol: "AMZN",
    asset_name: "Amazon.com Inc.",
    asset_type: "stock",
    side: "buy",
    order_type: "market",
    quantity: 4,
    price: 192.3,
    status: "completed",
    created_at: "2026-06-14T14:00:00Z",
  },
];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function StatusBadge({ status }: { status: TxStatus }) {
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1.5 text-up">
        <span className="h-1.5 w-1.5 rounded-full bg-up" aria-hidden="true" />
        Completed
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="flex items-center gap-1.5 text-yellow-400">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" aria-hidden="true" />
        Pending
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-down">
      <span className="h-1.5 w-1.5 rounded-full bg-down" aria-hidden="true" />
      Cancelled
    </span>
  );
}

function SideBadge({ side }: { side: TxSide }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
        side === "buy"
          ? "bg-up/10 text-up"
          : "bg-down/10 text-down"
      }`}
    >
      {side}
    </span>
  );
}

type FilterSide = "all" | TxSide;
type FilterAsset = "all" | AssetType;
type FilterStatus = "all" | TxStatus;

export function Transactions() {
  const [sideFilter, setSideFilter] = useState<FilterSide>("all");
  const [assetFilter, setAssetFilter] = useState<FilterAsset>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const filtered = useMemo(() => {
    return DUMMY_TRANSACTIONS.filter((tx) => {
      if (sideFilter !== "all" && tx.side !== sideFilter) return false;
      if (assetFilter !== "all" && tx.asset_type !== assetFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      return true;
    });
  }, [sideFilter, assetFilter, statusFilter]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Transactions"
        subtitle="Your paper trading and portfolio activity"
      />

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterSelect
          label="Type"
          value={sideFilter}
          onChange={(v) => setSideFilter(v as FilterSide)}
          options={[
            { value: "all", label: "All Types" },
            { value: "buy", label: "Buy" },
            { value: "sell", label: "Sell" },
          ]}
        />
        <FilterSelect
          label="Asset"
          value={assetFilter}
          onChange={(v) => setAssetFilter(v as FilterAsset)}
          options={[
            { value: "all", label: "All Assets" },
            { value: "crypto", label: "Crypto" },
            { value: "stock", label: "Stock" },
          ]}
        />
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as FilterStatus)}
          options={[
            { value: "all", label: "All Statuses" },
            { value: "completed", label: "Completed" },
            { value: "pending", label: "Pending" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No transactions"
          message="No transactions match your current filters."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden overflow-hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3">Item</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Type</th>
                  <th scope="col" className="px-4 py-3">Order</th>
                  <th scope="col" className="px-4 py-3 text-right">Amount</th>
                  <th scope="col" className="px-4 py-3 text-right">Total</th>
                  <th scope="col" className="px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-line/60 last:border-0 hover:bg-elevated"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <AssetIcon
                          asset={{
                            symbol: tx.asset_symbol,
                            name: tx.asset_name,
                            image: tx.asset_image,
                            type: tx.asset_type,
                          }}
                          size={32}
                        />
                        <div>
                          <p className="font-medium">{tx.asset_name}</p>
                          <p className="text-xs uppercase text-ink-muted">{tx.asset_symbol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3">
                      <SideBadge side={tx.side} />
                    </td>
                    <td className="px-4 py-3 text-ink-muted capitalize">{tx.order_type}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNumber(tx.quantity)}{" "}
                      <span className="text-xs text-ink-muted">{tx.asset_symbol}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatPrice(tx.quantity * tx.price)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-ink-muted tabular-nums">
                      {formatDate(tx.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 lg:hidden">
            {filtered.map((tx) => (
              <li key={tx.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AssetIcon
                      asset={{
                        symbol: tx.asset_symbol,
                        name: tx.asset_name,
                        image: tx.asset_image,
                        type: tx.asset_type,
                      }}
                      size={36}
                    />
                    <div>
                      <p className="font-semibold">{tx.asset_name}</p>
                      <p className="text-xs uppercase text-ink-muted">{tx.asset_symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatPrice(tx.quantity * tx.price)}</p>
                    <div className="mt-0.5 flex items-center justify-end gap-1.5">
                      <SideBadge side={tx.side} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                  <StatusBadge status={tx.status} />
                  <span className="tabular-nums">{formatDate(tx.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = `filter-${label.toLowerCase()}`;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm">
      <label htmlFor={id} className="text-ink-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-ink outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Navigate to `/transactions` in the running dev server (you'll need to be logged in due to AuthGuard). You should see:
- Page header "Transactions"
- Three filter dropdowns
- A table (desktop) or card list (mobile) with 15 dummy rows
- Each asset shows its icon (image for crypto, monogram for stocks)
- Buy rows show green badge, sell rows show red badge
- Status column shows colored dot + label

- [ ] **Step 3: Test each filter**

- Set Type = "Buy" → only buy rows remain
- Set Type = "Sell" → only sell rows remain
- Set Asset = "Crypto" → only crypto assets
- Set Asset = "Stock" → only stocks
- Set Status = "Pending" → 3 rows (BNB, MSFT, DOGE)
- Set Status = "Cancelled" → 2 rows (ADA, GOOGL)
- Combine Type = "Buy" + Status = "Cancelled" → 1 row (ADA)
- Combine to produce zero results → EmptyState "No transactions match your current filters." appears

- [ ] **Step 4: Commit**

```bash
git add src/pages/Transactions.tsx
git commit -m "feat: add Transactions page with dummy data and filters"
```

---

## Task 4: Update the Dashboard LatestTransactions Panel

**Files:**
- Modify: `src/components/dashboard/LatestTransactions.tsx`

**Interfaces:**
- Consumes: `Link` from `react-router-dom` (already used across the codebase).
- Produces: no external interface change — this is a self-contained UI update.

- [ ] **Step 1: Replace `src/components/dashboard/LatestTransactions.tsx`**

```tsx
import { Link } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { getLatestTransactions, sampleTxs } from "../../lib/mempool";
import { Panel } from "./Panel";
import { formatNumber } from "../../lib/format";

/** Recent unconfirmed Bitcoin transactions from mempool.space. */
export function LatestTransactions() {
  const { data, loading } = useAsync(
    () => getLatestTransactions(8),
    [],
    { initialData: { txs: sampleTxs(8), sample: true } },
  );

  return (
    <Panel title="Latest Transactions" subtitle="Bitcoin mempool">
      {loading && <p className="text-sm text-ink-muted">Loading…</p>}
      {data && (
        <ul className="space-y-1.5 font-mono text-xs">
          {data.txs.map((t) => (
            <li key={t.txid} className="flex items-center justify-between gap-2">
              <span className="truncate text-ink-muted" title={t.txid}>
                {t.txid.slice(0, 10)}…
              </span>
              <span className="shrink-0 tabular-nums text-ink">
                {formatNumber(t.valueBtc)} BTC
              </span>
            </li>
          ))}
        </ul>
      )}
      {data?.sample && (
        <p className="mt-2 text-[10px] text-ink-muted">Sample data (network unavailable)</p>
      )}
      <div className="mt-3 border-t border-line pt-3">
        <Link
          to="/transactions"
          className="text-xs font-medium text-brand hover:underline"
        >
          View all transactions →
        </Link>
      </div>
    </Panel>
  );
}
```

- [ ] **Step 2: Verify the dashboard panel**

Open the dashboard (`/`). In the "Latest Transactions" panel:
- Transaction IDs should now be plain text (not clickable links), styled `text-ink-muted`
- A "View all transactions →" link appears at the bottom in brand color
- Clicking it navigates to `/transactions` (or `/login` if not authenticated)

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/LatestTransactions.tsx
git commit -m "feat: link dashboard transactions panel to /transactions page"
```
