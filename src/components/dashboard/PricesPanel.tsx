import { Link } from "react-router-dom";
import type { Asset } from "../../types";
import { Panel } from "./Panel";
import { AssetIcon } from "../ui/AssetIcon";
import { ChangeBadge } from "../ui/ChangeBadge";
import { formatPrice } from "../../lib/format";

interface Props {
  assets: Asset[];
  /** Where the header arrow links (markets page for this asset type). */
  viewAllTo: string;
  count?: number;
}

/** Compact "Prices / Market Cap" list with a Trade action per row. */
export function PricesPanel({ assets, viewAllTo, count = 8 }: Props) {
  return (
    <Panel title="Prices" subtitle="Market Cap" to={viewAllTo}>
      <ul className="divide-y divide-line/60">
        {assets.slice(0, count).map((a) => (
          <li key={a.id} className="flex items-center gap-2.5 py-2">
            <AssetIcon asset={a} size={26} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{a.name}</p>
              <p className="text-[10px] uppercase text-ink-muted">{a.symbol}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-semibold tabular-nums leading-tight">
                {formatPrice(a.price)}
              </p>
              <ChangeBadge value={a.change24h} withIcon={false} />
            </div>
            <Link
              to={`/asset/${a.type}/${a.id}`}
              className="rounded-md bg-elevated px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-brand hover:text-white"
            >
              Trade
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
