import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, Treemap } from "recharts";
import type { Asset } from "../../types";
import { formatPercent } from "../../lib/format";

interface Props {
  assets: Asset[];
}

interface Node {
  id: string;
  name: string;
  size: number;
  change: number;
  [key: string]: string | number;
}

/** Color a tile from the 24h change: green for gains, red for losses. */
function tileColor(change: number): string {
  if (change >= 3) return "#15803d";
  if (change >= 1) return "#16a34a";
  if (change > 0) return "#22c55e";
  if (change === 0) return "#374151";
  if (change > -1) return "#ef4444";
  if (change > -3) return "#dc2626";
  return "#b91c1c";
}

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(h.slice(0, 2), 16));
  const g = toLin(parseInt(h.slice(2, 4), 16));
  const b = toLin(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const LIGHT_TEXT = "#F8FAFC";
const DARK_TEXT = "#0A0E1A";
const DARK_TEXT_LUM = luminance(DARK_TEXT);

/** Pick whichever of light/dark text has the higher contrast against the tile. */
function textColor(bg: string): string {
  const l = luminance(bg);
  const contrastLight = 1.05 / (l + 0.05);
  const contrastDark = (l + 0.05) / (DARK_TEXT_LUM + 0.05);
  return contrastLight >= contrastDark ? LIGHT_TEXT : DARK_TEXT;
}

/** Market-cap treemap: tile size = market cap, colour = 24h change. */
export function Heatmap({ assets }: Props) {
  const navigate = useNavigate();

  const data: Node[] = assets
    .filter((a) => a.marketCap)
    .slice(0, 18)
    .map((a) => ({
      id: a.id,
      name: a.symbol,
      size: a.marketCap ?? 0,
      change: a.change24h,
    }));

  return (
    <div className="h-full min-h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          stroke="#0A0E1A"
          isAnimationActive={false}
          content={<TreeCell onSelect={(id) => navigate(`/asset/crypto/${id}`)} />}
        />
      </ResponsiveContainer>
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
  id?: string;
  onSelect: (id: string) => void;
}

function TreeCell({ x = 0, y = 0, width = 0, height = 0, name, change = 0, id, onSelect }: CellProps) {
  const showText = width > 44 && height > 28;
  const bg = tileColor(change);
  const ink = textColor(bg);
  return (
    <g
      onClick={() => id && onSelect(id)}
      style={{ cursor: id ? "pointer" : "default" }}
    >
      <rect x={x} y={y} width={width} height={height} fill={bg} rx={4} />
      {showText && (
        <>
          <text
            x={x + 6}
            y={y + 17}
            fill={ink}
            fontSize={12}
            fontWeight={700}
            style={{ textShadow: "none" }}
          >
            {name}
          </text>
          {height > 42 && (
            <text
              x={x + 6}
              y={y + 32}
              fill={ink}
              fillOpacity={0.85}
              fontSize={10}
              style={{ textShadow: "none" }}
            >
              {formatPercent(change)}
            </text>
          )}
        </>
      )}
    </g>
  );
}
