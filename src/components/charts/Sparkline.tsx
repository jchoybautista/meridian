import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

interface Props {
  data: number[];
  trend: "up" | "down" | "flat";
  height?: number | string;
}

/** Tiny axis-less area chart for cards. Decorative — hidden from a11y tree. */
export function Sparkline({ data, trend, height = 56 }: Props) {
  const color = trend === "down" ? "#EF4444" : trend === "up" ? "#22C55E" : "#6366F1";
  const id = `spark-${trend}-${data.length}`;
  const points = data.map((price, i) => ({ i, price }));

  const minPrice = Math.min(...data);
  const maxPrice = Math.max(...data);
  const pad = (maxPrice - minPrice) * 0.1 || maxPrice * 0.05;
  const domainMin = minPrice - pad;
  const domainMax = maxPrice + pad;

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
          <YAxis domain={[domainMin, domainMax]} hide />
          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${id})`}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
            dot={false}
            baseValue={domainMin}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
