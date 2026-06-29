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
          <label htmlFor="add-funds-amount" className="mb-1 block text-xs text-ink-muted">Amount (USD)</label>
          <input
            id="add-funds-amount"
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
        {new Date(order.created_at).toLocaleString("en-US", {
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
