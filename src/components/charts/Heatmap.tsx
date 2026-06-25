import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, Treemap } from "recharts";
import type { Asset } from "../../types";
import { formatPercent, formatPrice } from "../../lib/format";

interface Props {
  assets: Asset[];
}

interface Node {
  id: string;
  name: string;
  size: number;
  change: number;
  price: number;
  [key: string]: string | number;
}

/** Deep red→green ramp by 24h change; tuned dark enough for white text. */
function tileColor(change: number): string {
  if (change >= 5) return "#15803D";
  if (change >= 2) return "#166534";
  if (change > 0) return "#15643C";
  if (change === 0) return "#374151";
  if (change > -2) return "#7F1D1D";
  if (change > -5) return "#991B1B";
  return "#B91C1C";
}

interface HoverInfo {
  name: string;
  price: number;
  change: number;
  marketCap: number;
  x: number;
  y: number;
}

/** Market-cap treemap: tile size = market cap, colour = 24h change. */
export function Heatmap({ assets }: Props) {
  const navigate = useNavigate();
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const data: Node[] = assets
    .filter((a) => a.marketCap)
    .slice(0, 18)
    .map((a) => ({
      id: a.id,
      name: a.symbol,
      size: a.marketCap ?? 0,
      change: a.change24h,
      price: a.price,
      marketCap: a.marketCap ?? 0,
    }));

  return (
    <div className="relative h-full min-h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          stroke="none"
          isAnimationActive={false}
          content={
            <TreeCell
              onSelect={(id) => navigate(`/asset/crypto/${id}`)}
              onHover={setHover}
            />
          }
        />
      </ResponsiveContainer>

      {hover && (
        <div
          className="pointer-events-none absolute z-20 min-w-[150px] rounded-lg border border-line bg-card/95 px-3 py-2 text-xs shadow-2xl backdrop-blur"
          style={{
            left: `min(${hover.x}px, calc(100% - 160px))`,
            top: Math.max(4, hover.y - 70),
          }}
          role="status"
        >
          <p className="font-bold">{hover.name}</p>
          <p className="tabular-nums">{formatPrice(hover.price)}</p>
          <p className={`tabular-nums ${hover.change >= 0 ? "text-up" : "text-down"}`}>
            {formatPercent(hover.change)}
          </p>
          <p className="text-ink-muted tabular-nums">
            Mkt Cap {formatPrice(hover.marketCap).replace(/\.\d+/, "")}
          </p>
        </div>
      )}
    </div>
  );
}

interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  change?: number;
  price?: number;
  marketCap?: number;
  id?: string;
  onSelect: (id: string) => void;
  onHover: (info: HoverInfo | null) => void;
}

function TreeCell({
  x = 0, y = 0, width = 0, height = 0,
  name, change = 0, price = 0, marketCap = 0, id, onSelect, onHover,
}: CellProps) {
  const showText = width > 40 && height > 24;
  const showPrice = width > 96 && height > 56;
  const bg = tileColor(change);
  return (
    <g
      onClick={() => id && onSelect(id)}
      onMouseEnter={() => name && onHover({ name, price, change, marketCap, x: x + width / 2, y })}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: id ? "pointer" : "default" }}
    >
      {/* inset rect → thin gap between tiles instead of a heavy black border */}
      <rect x={x + 1} y={y + 1} width={Math.max(0, width - 2)} height={Math.max(0, height - 2)} fill={bg} rx={5} />
      {showText && (
        <>
          <text
            x={x + 8} y={y + 18} fill="#F8FAFC" fontSize={13} fontWeight={700}
            style={{ textShadow: "0 1px 2px rgba(0,0,0,.45)" }}
          >
            {name}
          </text>
          <text
            x={x + 8} y={y + 34} fill="#F8FAFC" fontSize={11} fontWeight={600}
            style={{ textShadow: "0 1px 2px rgba(0,0,0,.45)" }}
          >
            {formatPercent(change)}
          </text>
          {showPrice && (
            <text
              x={x + 8} y={y + 51} fill="#F8FAFC" fillOpacity={0.85} fontSize={11}
              style={{ textShadow: "0 1px 2px rgba(0,0,0,.45)" }}
            >
              {formatPrice(price)}
            </text>
          )}
        </>
      )}
    </g>
  );
}
