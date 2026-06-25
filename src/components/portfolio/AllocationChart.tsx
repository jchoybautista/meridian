import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { HoldingWithPnL } from "../../types";
import { formatCompactUsd } from "../../lib/format";

const COLORS = [
  "#6366F1",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
  "#EC4899",
  "#14B8A6",
  "#84CC16",
];

interface Props {
  holdings: HoldingWithPnL[];
  loading: boolean;
}

export function AllocationChart({ holdings, loading }: Props) {
  if (loading) {
    return (
      <div className="card p-5 h-full flex flex-col">
        <div className="skeleton h-4 w-24 rounded mb-3" />
        <div className="skeleton flex-1 rounded-full mx-auto" style={{ width: 180, height: 180 }} />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-3 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const data = holdings
    .filter((h) => h.marketValue > 0)
    .sort((a, b) => b.marketValue - a.marketValue)
    .map((h) => ({ name: h.asset_symbol, value: h.marketValue, fullName: h.asset_name }));

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="card p-5 h-full flex items-center justify-center">
        <p className="text-sm text-ink-muted">No holdings to display</p>
      </div>
    );
  }

  return (
    <div className="card p-5 h-full">
      <h2 className="mb-3 text-sm font-semibold">Allocation</h2>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, _name, entry) => {
              const num = typeof v === "number" ? v : 0;
              const fullName = (entry?.payload as { fullName?: string } | undefined)?.fullName ?? "";
              return [
                `${formatCompactUsd(num)} (${total > 0 ? ((num / total) * 100).toFixed(1) : 0}%)`,
                fullName,
              ];
            }}
            contentStyle={{
              background: "#111827",
              border: "1px solid #1F2937",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-ink-muted">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
