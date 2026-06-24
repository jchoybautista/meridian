import { Box } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getLatestBlocks } from "../../lib/mempool";
import { Panel } from "./Panel";

function timeAgo(unixSeconds: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

/** Recent Bitcoin blocks from mempool.space. */
export function LatestBlocks() {
  const { data, loading } = useAsync(() => getLatestBlocks(5), []);

  return (
    <Panel title="Latest Blocks" subtitle="Bitcoin">
      {loading && <p className="text-sm text-ink-muted">Loading…</p>}
      {data && (
        <ul className="space-y-2">
          {data.blocks.map((b) => (
            <li key={b.height} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-brand">
                <Box className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <a
                  href={`https://mempool.space/block/${b.height}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  {b.height.toLocaleString()}
                </a>
                <p className="text-[11px] text-ink-muted">{timeAgo(b.timestamp)}</p>
              </div>
              <div className="ml-auto text-right text-[11px] text-ink-muted">
                <p className="tabular-nums">{b.txCount.toLocaleString()} txs</p>
                <p className="tabular-nums">{b.sizeMB} MB</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data?.sample && (
        <p className="mt-2 text-[10px] text-ink-muted">Sample data (network unavailable)</p>
      )}
    </Panel>
  );
}
