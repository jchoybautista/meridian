import { useEffect, useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { getFearGreed } from "../../lib/feargreed";
import { Panel } from "./Panel";

function fgColor(value: number): string {
  if (value <= 25) return "#ef4444";
  if (value <= 46) return "#f97316";
  if (value <= 54) return "#eab308";
  if (value <= 75) return "#14b8a6";
  return "#22c55e";
}

/**
 * SVG semicircle gauge. The arc spans 180° from left (0) to right (100).
 * cx=100, cy=100, r=80. Arc starts at 180° and sweeps clockwise.
 */
function GaugeArc({ value }: { value: number }) {
  const cx = 100;
  const cy = 100;
  const r = 78;
  const strokeWidth = 14;

  // Reveal the arc on mount (draw-in effect) rather than on every value change.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Convert value (0-100) to angle in degrees along the semicircle (0° = left, 180° = right)
  const angleDeg = (value / 100) * 180;
  // Convert to radians relative to the left start (180° in standard coords)
  const angleRad = ((180 + angleDeg) * Math.PI) / 180;
  // Arc length of the value sweep, used to animate the stroke drawing in.
  const sweepLength = r * ((angleDeg * Math.PI) / 180);

  // Track arc: full semicircle background
  const trackStart = { x: cx - r, y: cy };
  const trackEnd = { x: cx + r, y: cy };

  // Value arc: from left to current value
  const valueEndX = cx + r * Math.cos(angleRad);
  const valueEndY = cy + r * Math.sin(angleRad);
  const largeArc = angleDeg > 180 ? 1 : 0;

  const color = fgColor(value);

  return (
    <svg
      viewBox="0 0 200 115"
      aria-hidden="true"
      className="w-full max-w-[320px]"
    >
      {/* Track (background arc) — flat ends so it doesn't bulge into a circle */}
      <path
        d={`M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 0 1 ${trackEnd.x} ${trackEnd.y}`}
        fill="none"
        stroke="#27272a"
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />

      {/* Value arc — draws in from the start of the track on mount, flat ends */}
      {value > 0 && (
        <path
          d={`M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 ${largeArc} 1 ${valueEndX} ${valueEndY}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={sweepLength}
          strokeDashoffset={revealed ? 0 : sweepLength}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      )}


      {/* Numeric value */}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="auto"
        fill={color}
        fontSize="34"
        fontWeight="800"
        fontFamily="inherit"
        style={{
          opacity: revealed ? 1 : 0,
          transition: "opacity 0.5s ease-out 0.4s",
        }}
      >
        {value}
      </text>
    </svg>
  );
}

/** Fear & Greed Index widget — fetches from Alternative.me, caches 1 hour. */
export function FearGreedGauge({ className }: { className?: string }) {
  const { data, loading } = useAsync(getFearGreed, []);

  return (
    <Panel title="Market Sentiment" subtitle="Fear & Greed Index" className={className}>
      {loading ? (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <div className="skeleton h-20 w-full max-w-[200px] rounded-full" aria-hidden="true" />
          <div className="skeleton h-4 w-24 rounded" aria-hidden="true" />
        </div>
      ) : data ? (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 px-4"
          aria-label={`Fear and Greed Index: ${data.value} — ${data.classification}`}
        >
          <GaugeArc value={data.value} />
          <p
            className="text-base font-bold sm:text-lg"
            style={{ color: fgColor(data.value) }}
          >
            {data.classification}
          </p>
          <p className="text-xs text-ink-muted">Updated daily · Alternative.me</p>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-ink-muted">
          Unavailable
        </div>
      )}
    </Panel>
  );
}
