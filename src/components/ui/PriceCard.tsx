import { Link } from "react-router-dom";
import type { Asset } from "../../types";
import { formatPrice } from "../../lib/format";
import { ChangeBadge } from "./ChangeBadge";
import { AssetIcon } from "./AssetIcon";

interface Props {
  asset: Asset;
}

/** Compact tappable card summarising one asset. Links to its detail page. */
export function PriceCard({ asset }: Props) {
  return (
    <Link
      to={`/asset/${asset.type}/${asset.id}`}
      className="card group flex min-h-[44px] flex-col gap-3 p-5 transition-colors hover:border-brand/60 hover:bg-elevated"
      aria-label={`${asset.name}, ${formatPrice(asset.price)}, 24 hour change ${asset.change24h.toFixed(2)} percent`}
    >
      <div className="flex items-center gap-3">
        <AssetIcon asset={asset} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{asset.name}</p>
          <p className="text-xs uppercase tracking-wide text-ink-muted">{asset.symbol}</p>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-lg font-semibold tabular-nums">{formatPrice(asset.price)}</span>
        <ChangeBadge value={asset.change24h} />
      </div>
    </Link>
  );
}
