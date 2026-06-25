import { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";
import { getCryptoMarkets } from "../../lib/coingecko";
import { STOCK_UNIVERSE } from "../../lib/stockSeed";
import type { Transaction } from "../../types";

type NewTx = Omit<Transaction, "id" | "user_id" | "created_at">;

interface SearchResult {
  id: string;
  symbol: string;
  name: string;
  type: "crypto" | "stock";
  image?: string;
}

interface Props {
  onClose(): void;
  onSubmit(t: NewTx): Promise<{ error: string | null }>;
}

export function AddTransactionModal({ onClose, onSubmit }: Props) {
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState<SearchResult[]>([]);
  const [selected,   setSelected]   = useState<SearchResult | null>(null);
  const [txType,     setTxType]     = useState<"buy" | "sell">("buy");
  const [quantity,   setQuantity]   = useState("");
  const [price,      setPrice]      = useState("");
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState<string | null>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounced asset search
  useEffect(() => {
    clearTimeout(searchRef.current);
    if (!query.trim()) { setResults([]); return; }
    searchRef.current = setTimeout(() => {
      void (async () => {
        const q = query.toLowerCase();
        // Stock matches (local, instant)
        const stockMatches: SearchResult[] = STOCK_UNIVERSE
          .filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
          .slice(0, 5)
          .map((s) => ({ id: s.symbol, symbol: s.symbol, name: s.name, type: "stock" as const }));
        // Crypto: use cached market list (already loaded elsewhere)
        let cryptoMatches: SearchResult[] = [];
        try {
          const coins = await getCryptoMarkets(50, 1, false);
          cryptoMatches = coins
            .filter((c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
            .slice(0, 5)
            .map((c) => ({ id: c.id, symbol: c.symbol, name: c.name, type: "crypto" as const, image: c.image }));
        } catch { /* ignore */ }
        setResults([...cryptoMatches, ...stockMatches].slice(0, 8));
      })();
    }, 300);
    return () => clearTimeout(searchRef.current);
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setFormError("Select an asset."); return; }
    const qty  = parseFloat(quantity);
    const ppu  = parseFloat(price);
    if (isNaN(qty) || qty <= 0)  { setFormError("Enter a valid quantity."); return; }
    if (isNaN(ppu) || ppu < 0)   { setFormError("Enter a valid price."); return; }
    if (!date) { setFormError("Select a date."); return; }
    setSubmitting(true);
    setFormError(null);
    const { error } = await onSubmit({
      asset_id:       selected.id,
      asset_symbol:   selected.symbol,
      asset_name:     selected.name,
      asset_type:     selected.type,
      type:           txType,
      quantity:       qty,
      price_per_unit: ppu,
      transacted_at:  date,
      notes:          notes.trim() || null,
    });
    setSubmitting(false);
    if (error) { setFormError(error); return; }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add Transaction"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Add Transaction</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 hover:bg-elevated"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          {/* Asset search */}
          {!selected ? (
            <div>
              <label className="mb-1 block text-xs text-ink-muted">Search asset</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Bitcoin, AAPL…"
                  className="w-full rounded-lg border border-line bg-elevated py-2.5 pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>
              {results.length > 0 && (
                <ul className="mt-1 rounded-lg border border-line bg-card shadow-xl">
                  {results.map((r) => (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        type="button"
                        onClick={() => { setSelected(r); setQuery(""); setResults([]); }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-elevated transition-colors"
                      >
                        {r.image && <img src={r.image} alt="" className="h-5 w-5 rounded-full" />}
                        <span className="font-semibold">{r.symbol}</span>
                        <span className="text-ink-muted truncate">{r.name}</span>
                        <span
                          className={`ml-auto text-[10px] rounded px-1.5 py-0.5 ${
                            r.type === "crypto" ? "bg-brand/20 text-brand" : "bg-elevated text-ink-muted"
                          }`}
                        >
                          {r.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-brand/40 bg-brand/10 px-4 py-2.5">
              <div>
                <p className="font-semibold">{selected.symbol}</p>
                <p className="text-xs text-ink-muted">{selected.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-brand hover:underline"
              >
                Change
              </button>
            </div>
          )}

          {/* Buy / Sell toggle */}
          <div>
            <label className="mb-1 block text-xs text-ink-muted">Type</label>
            <div className="flex rounded-lg border border-line bg-elevated p-1 gap-1">
              {(["buy", "sell"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTxType(t)}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold capitalize transition-colors ${
                    txType === t
                      ? t === "buy"
                        ? "bg-up text-white"
                        : "bg-down text-white"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="qty" className="mb-1 block text-xs text-ink-muted">Quantity</label>
              <input
                id="qty"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-line bg-elevated px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="ppu" className="mb-1 block text-xs text-ink-muted">Price per unit</label>
              <input
                id="ppu"
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-line bg-elevated px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="mb-1 block text-xs text-ink-muted">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-line bg-elevated px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="mb-1 block text-xs text-ink-muted">Notes (optional)</label>
            <input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-line bg-elevated px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
              placeholder="e.g. DCA buy"
            />
          </div>

          {formError && <p className="text-xs text-down">{formError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] rounded-lg bg-brand py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Saving…" : `Add ${txType.charAt(0).toUpperCase() + txType.slice(1)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
