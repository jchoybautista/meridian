import { Trash2 } from "lucide-react";
import type { Transaction } from "../../types";
import { formatPrice } from "../../lib/format";

interface Props {
  transactions: Transaction[];
  onDelete(id: string): Promise<void>;
  loading: boolean;
}

export function TransactionHistory({ transactions, onDelete, loading }: Props) {
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this transaction? P&L will be recalculated.")) return;
    await onDelete(id);
  };

  if (loading) {
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
              {[0, 1, 2].map((i) => (
                <tr key={i} className="border-b border-line/50">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-elevated" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="card mt-6 overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 text-sm font-semibold">Transaction History</h2>
        <p className="px-5 py-8 text-center text-sm text-ink-muted">
          No transactions yet. Add your first buy or sell above.
        </p>
      </div>
    );
  }

  // Sort newest first
  const sorted = [...transactions].sort(
    (a, b) => b.transacted_at.localeCompare(a.transacted_at),
  );

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
            {sorted.map((t) => (
              <tr
                key={t.id}
                className="border-b border-line/50 hover:bg-elevated/30 transition-colors"
              >
                <td className="px-5 py-3 font-semibold">{t.asset_symbol}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      t.type === "buy"
                        ? "bg-up/15 text-up"
                        : "bg-down/15 text-down"
                    }`}
                  >
                    {t.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{t.quantity}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPrice(t.price_per_unit)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatPrice(t.quantity * t.price_per_unit)}
                </td>
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
