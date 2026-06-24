import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

interface Props {
  data: number[];
  trend: "up" | "down" | "flat";
  height?: number;
}

/** Tiny axis-less area chart for cards. Decorative — hidden from a11y tree. */
export function Sparkline({ data, trend, height = 56 }: Props) {
  const color = trend === "down" ? "#EF4444" : trend === "up" ? "#22C55E" : "#6366F1";
  const id = `spark-${trend}-${data.length}`;
  const points = data.map((price, i) => ({ i, price }));

  return (
    <div style={{ height }} className="w-full" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["auto", "auto"]} hide />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
