import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { usePortfolio } from "../hooks/usePortfolio";
import { SummaryBar } from "../components/portfolio/SummaryBar";
import { AllocationChart } from "../components/portfolio/AllocationChart";
import { HoldingsTable } from "../components/portfolio/HoldingsTable";
import { AddTransactionModal } from "../components/portfolio/AddTransactionModal";
import { TransactionHistory } from "../components/portfolio/TransactionHistory";
import type { HoldingWithPnL } from "../types";

export function Portfolio() {
  const { transactions, holdings, summary, isLive, loading, error, addTransaction, deleteTransaction } =
    usePortfolio();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const isEmpty = !loading && transactions.length === 0;

  function handleNavigate(h: HoldingWithPnL) {
    void navigate(`/asset/${h.asset_type}/${h.asset_id}`);
  }

  return (
    <div className="animate-fade-in">
      {/* Summary bar (contains the "Portfolio" h1 title) + Add Transaction button */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1">
          <SummaryBar summary={summary} loading={loading} isLive={isLive} />
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90 mt-8"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Transaction
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-down/30 bg-down/10 px-4 py-3 text-sm text-down">
          {error}
        </div>
      )}

      {isEmpty ? (
        /* Empty state */
        <div className="card flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15">
            <Plus className="h-8 w-8 text-brand" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold">No transactions yet</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Add your first buy or sell to start tracking your portfolio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="min-h-[44px] rounded-lg bg-brand px-6 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            Add First Transaction
          </button>
        </div>
      ) : (
        <>
          {/* Bento: allocation chart + holdings table */}
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <AllocationChart holdings={holdings} loading={loading} />
            </div>
            <div className="lg:col-span-2">
              <HoldingsTable
                holdings={holdings}
                loading={loading}
                onNavigate={handleNavigate}
              />
            </div>
          </div>

          {/* Transaction history */}
          <TransactionHistory
            transactions={transactions}
            onDelete={deleteTransaction}
            loading={loading}
          />
        </>
      )}

      {showModal && (
        <AddTransactionModal
          onClose={() => setShowModal(false)}
          onSubmit={addTransaction}
        />
      )}
    </div>
  );
}
