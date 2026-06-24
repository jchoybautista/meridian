import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DominanceSlice } from "../../lib/coingecko";

interface Props {
  data: DominanceSlice[];
}

const COLORS = [
  "#6366F1",
  "#22C55E",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#A855F7",
  "#64748B",
];

/** Market-cap dominance donut with a legend. */
export function DominancePie({ data }: Props) {
  const chartData = data.map((d) => ({ name: d.symbol, value: +d.percent.toFixed(2) }));

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-[160px] flex-1" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#111827",
                border: "1px solid #1F2937",
                borderRadius: 12,
                color: "#F9FAFB",
              }}
              formatter={(v) => [`${Number(v)}%`, "Dominance"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {chartData.map((d, i) => (
          <li key={d.name} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
              aria-hidden="true"
            />
            <span className="truncate text-ink-muted">{d.name}</span>
            <span className="ml-auto font-medium tabular-nums">{d.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
