import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
} from "recharts";
import { useAsync } from "../../hooks/useAsync";
import { getSectorPerformance } from "../../lib/finnhub";
import { Panel } from "./Panel";

function BarLabel({ x = 0, y = 0, width = 0, height = 0, value }: { x?: number; y?: number; width?: number; height?: number; value?: number }) {
  if (value == null) return null;
  const text = `${value > 0 ? "+" : ""}${Number(value).toFixed(1)}%`;
  return (
    <text x={Math.max(x, x + width) + 4} y={y + height / 2} fill="#9CA3AF" fontSize={10} dominantBaseline="middle">
      {text}
    </text>
  );
}

export function SectorPerformance() {
  const { data, loading } = useAsync(getSectorPerformance, []);

  const sorted = [...(data ?? [])].sort((a, b) => b.changesPercentage - a.changesPercentage);

  return (
    <Panel title="📊 Sector Performance" subtitle="Today's change by sector">
      {loading ? (
        <div className="skeleton h-full min-h-[200px] rounded-lg" aria-hidden="true" />
      ) : sorted.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-ink-muted">
          Sector data unavailable
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide domain={["auto", "auto"]} />
            <YAxis
              type="category"
              dataKey="sector"
              tick={{ fontSize: 10, fill: "#6B7280" }}
              width={110}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => {
                const n = Number(v);
                return [`${n > 0 ? "+" : ""}${n.toFixed(2)}%`, "Change"] as [string, string];
              }}
              contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12, color: "#F9FAFB" }}
              labelStyle={{ color: "#F9FAFB", fontWeight: 600, marginBottom: 4 }}
              itemStyle={{ color: "#F9FAFB" }}
            />
            <Bar dataKey="changesPercentage" radius={[0, 3, 3, 0]} label={<BarLabel />}>
              {sorted.map((s, i) => (
                <Cell key={i} fill={s.changesPercentage >= 0 ? "#22C55E" : "#EF4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}
