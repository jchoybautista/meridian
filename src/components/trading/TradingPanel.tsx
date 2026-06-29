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
