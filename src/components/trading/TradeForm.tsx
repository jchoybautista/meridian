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
