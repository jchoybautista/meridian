import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
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

/** Market-cap dominance donut — legend right on wide screens, below on narrow. */
export function DominancePie({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const chartData = data.map((d) => ({ name: d.symbol, value: +d.percent.toFixed(2) }));

  // Segment pops out on hover (wedge or legend) for a tactile feel.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderShape(props: any) {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, index } = props;
    const isActive = index === activeIndex;
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={isActive ? innerRadius - 2 : innerRadius}
        outerRadius={isActive ? outerRadius + 8 : outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: isActive ? `drop-shadow(0 0 8px ${fill}88)` : undefined,
          transition: "all 0.2s ease",
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row lg:gap-6">
      {/* Donut */}
      <div className="min-h-[160px] flex-1 self-stretch" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="40%"
              outerRadius="86%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive
              animationBegin={0}
              animationDuration={900}
              animationEasing="ease-out"
              shape={renderShape}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                  opacity={activeIndex === undefined || activeIndex === i ? 1 : 0.45}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#0f1117",
                border: "1px solid #1F2937",
                borderRadius: 12,
                color: "#F9FAFB",
                fontSize: 13,
              }}
              formatter={(v) => [`${Number(v)}%`, "Dominance"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend — 2-col grid on mobile, single column on right at lg */}
      <ul
        className="mt-3 grid grid-cols-2 content-center gap-x-4 gap-y-2 text-xs lg:mt-0 lg:w-40 lg:grid-cols-1 lg:gap-y-3"
        role="list"
        aria-label="Market dominance breakdown"
      >
        {chartData.map((d, i) => (
          <li
            key={d.name}
            className="flex cursor-default items-center gap-2 transition-opacity"
            style={{
              opacity: activeIndex === undefined || activeIndex === i ? 1 : 0.4,
              animationDelay: `${i * 60}ms`,
            }}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(undefined)}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
              aria-hidden="true"
            />
            <span className="truncate text-ink-muted">{d.name}</span>
            <span className="font-semibold tabular-nums" style={{ color: COLORS[i % COLORS.length] }}>
              {d.value}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
