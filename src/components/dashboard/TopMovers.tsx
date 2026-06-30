import { Link } from "react-router-dom";
import type { Asset } from "../../types";
import { Panel } from "./Panel";
import { AssetIcon } from "../ui/AssetIcon";
import { ChangeBadge } from "../ui/ChangeBadge";
import { formatPrice } from "../../lib/format";

interface Props {
  assets: Asset[];
  className?: string;
  count?: number;
}

function Row({ a }: { a: Asset }) {
  return (
    <li>
      <Link
        to={`/asset/${a.type}/${a.id}`}
        className="flex items-center gap-2.5 py-1.5 hover:text-brand"
      >
        <AssetIcon asset={a} size={24} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.symbol}</span>
        <span className="text-sm tabular-nums">{formatPrice(a.price)}</span>
        <span className="w-16 text-right">
          <ChangeBadge value={a.change24h} withIcon={false} />
        </span>
      </Link>
    </li>
  );
}

/** Biggest 24h gainers and losers from the supplied list. */
export function TopMovers({ assets, className, count = 4 }: Props) {
  const sorted = [...assets].sort((a, b) => b.change24h - a.change24h);
  const gainers = sorted.slice(0, count);
  const losers = sorted.slice(-count).reverse();

  return (
    <Panel title="Top Movers" subtitle="24h gainers & losers" className={className}>
      <div className="space-y-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-up">Gainers</p>
          <ul className="divide-y divide-line/50">
            {gainers.map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-down">Losers</p>
          <ul className="divide-y divide-line/50">
            {losers.map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
