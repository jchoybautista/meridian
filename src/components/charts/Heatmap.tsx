import { useNavigate } from "react-router-dom";
import type { Asset } from "../../types";
import { formatPercent } from "../../lib/format";

interface Props {
  assets: Asset[];
}

// Top-8 by market cap: first two get large tiles, rest get small
const SPANS = [
  "col-span-3 row-span-2",
  "col-span-3 row-span-2",
  "col-span-2 row-span-1",
  "col-span-2 row-span-1",
  "col-span-2 row-span-1",
  "col-span-2 row-span-1",
  "col-span-2 row-span-1",
  "col-span-2 row-span-1",
];

function cellColor(change: number) {
  const a = Math.min(Math.abs(change) / 6, 1) * 0.5 + 0.12;
  return change >= 0 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`;
}

export function Heatmap({ assets }: Props) {
  const navigate = useNavigate();

  const top8 = assets
    .filter((a) => a.marketCap)
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .slice(0, 8);

  return (
    <div className="grid h-full auto-rows-fr grid-cols-6 gap-1.5">
      {top8.map((asset, i) => {
        const span = SPANS[i] ?? "col-span-2 row-span-1";
        const isUp = asset.change24h >= 0;
        return (
          <button
            key={asset.id}
            className={`${span} animate-fade-in flex flex-col items-center justify-center rounded-lg transition-colors duration-700 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand`}
            style={{
              background: cellColor(asset.change24h),
              animationDelay: `${i * 60}ms`,
              animationFillMode: "backwards",
            }}
            onClick={() => navigate(`/asset/crypto/${asset.id}`)}
          >
            <span className="text-sm font-bold text-white">{asset.symbol}</span>
            <span className={`text-[11px] font-semibold tabular-nums ${isUp ? "text-up" : "text-down"}`}>
              {formatPercent(asset.change24h)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
