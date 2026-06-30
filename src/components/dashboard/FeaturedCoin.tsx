import { Link } from "react-router-dom";
import type { Asset } from "../../types";
import { AssetIcon } from "../ui/AssetIcon";
import { ChangeBadge } from "../ui/ChangeBadge";
import { Sparkline } from "../charts/Sparkline";
import { formatCompactUsd, formatPrice, changeDirection } from "../../lib/format";

interface Props {
  asset: Asset;
  /** Small eyebrow label explaining why this asset is featured, e.g. "Top by Market Cap". */
  label?: string;
}

/** Spotlight card for one coin: price, change, sparkline, and quick stats. */
export function FeaturedCoin({ asset, label }: Props) {
  const trend = changeDirection(asset.change24h);

  return (
    <Link
      to={`/asset/${asset.type}/${asset.id}`}
      className="card flex flex-col p-5 transition-colors hover:border-brand/60"
    >
      {label && (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </p>
      )}
      <div className="flex items-center gap-2.5">
        <AssetIcon asset={asset} size={32} />
        <div>
          <p className="font-bold leading-tight">{asset.name}</p>
          <p className="text-[10px] uppercase text-ink-muted">{asset.symbol}</p>
        </div>
        <span className="ml-auto">
          <ChangeBadge value={asset.change24h} />
        </span>
      </div>

      <p className="mt-3 text-xl font-extrabold tabular-nums">{formatPrice(asset.price)}</p>

      {asset.sparkline && asset.sparkline.length > 1 && (
        <div className="mt-2 flex-1 min-h-0">
          <Sparkline data={asset.sparkline} trend={trend} height="100%" />
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 pt-3 text-[11px]">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Mkt Cap</dt>
          <dd className="tabular-nums">{formatCompactUsd(asset.marketCap)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Vol 24h</dt>
          <dd className="tabular-nums">{formatCompactUsd(asset.volume24h)}</dd>
        </div>
      </dl>
    </Link>
  );
}
