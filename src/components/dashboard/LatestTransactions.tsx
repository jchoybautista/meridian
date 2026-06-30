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
      <div className="mt-2 border-t border-line pt-2">
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
