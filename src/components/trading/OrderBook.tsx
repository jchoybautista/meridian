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
    <li className="relative flex items-center justify-between px-4 py-[3px] text-xs tabular-nums">
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
    <li key={i} className="h-[22px] px-4 py-[3px]">
      <div className="h-3 w-full skeleton rounded" />
    </li>
  );

  return (
    <div className="flex h-full flex-col text-[11px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
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
      <div className="flex items-center justify-between px-4 py-1.5 text-[10px] text-ink-muted">
        <span>Price (USD)</span>
        <span>Qty</span>
      </div>

      {/* Asks — reversed so the lowest ask is nearest the mid-price row */}
      <ul className="flex-1 overflow-hidden">
        {book
          ? [...book.asks].reverse().map((level) => (
              <DepthRow key={level.price.toFixed(8)} level={level} maxQty={maxQty} side="ask" />
            ))
          : Array.from({ length: 10 }, (_, i) => skeletonRow(i))}
      </ul>

      {/* Mid-price / spread row */}
      <div className="border-y border-white/10 bg-elevated px-4 py-1.5 text-center text-xs font-bold tabular-nums">
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
          ? book.bids.map((level) => (
              <DepthRow key={level.price.toFixed(8)} level={level} maxQty={maxQty} side="bid" />
            ))
          : Array.from({ length: 10 }, (_, i) => skeletonRow(i + 10))}
      </ul>
    </div>
  );
}
