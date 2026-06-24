import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PricePoint } from "../../types";
import { formatPrice } from "../../lib/format";

interface Props {
  data: PricePoint[];
  /** Direction tints the line/fill green or red. */
  trend: "up" | "down" | "flat";
}

/**
 * Responsive area chart of price history. Hidden from the a11y tree (decorative
 * visualisation); the surrounding page exposes the same data as text/stats.
 */
export function PriceChart({ data, trend }: Props) {
  const color = trend === "down" ? "#EF4444" : trend === "up" ? "#22C55E" : "#6366F1";
  const gradientId = `grad-${trend}`;

  const formatTime = (t: number) =>
    new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="h-72 w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={["auto", "auto"]}
            stroke="#9CA3AF"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={70}
            tickFormatter={(v) => formatPrice(v)}
          />
          <Tooltip
            contentStyle={{
              background: "#111827",
              border: "1px solid #1F2937",
              borderRadius: 12,
              color: "#F9FAFB",
            }}
            labelFormatter={(t) => new Date(t as number).toLocaleString()}
            formatter={(v) => [formatPrice(Number(v)), "Price"]}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
