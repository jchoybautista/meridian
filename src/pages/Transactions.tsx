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
        side === "buy" ? "bg-up/10 text-up" : "bg-down/10 text-down"
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
              <li key={tx.id} className="card p-5">
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
