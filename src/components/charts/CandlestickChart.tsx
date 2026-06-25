import { useEffect, useRef } from "react";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from "lightweight-charts";
import type { OHLCPoint } from "../../lib/coingecko";
import { candleStats, formatCandleTime } from "../../lib/candle";
import { formatPrice, formatNumber, formatCompactUsd, formatPercent } from "../../lib/format";

interface Props {
  data: OHLCPoint[];
  trend: "up" | "down" | "flat";
  /** Latest (possibly still-forming) candle from a live stream. */
  liveCandle?: OHLCPoint | null;
  /** Show time-of-day on the axis (intraday intervals) vs. dates only. */
  intraday?: boolean;
}

const UP_COLOR = "#22C55E";
const DOWN_COLOR = "#EF4444";

/** Comfortable default candle width; native wheel/pinch zoom widens/narrows from here. */
const DEFAULT_BAR_SPACING = 9;

export function CandlestickChart({ data, trend, liveCandle, intraday = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastTimeRef = useRef<number>(0);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const pointsByTimeRef = useRef<Map<number, OHLCPoint>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#9CA3AF",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.2)", labelBackgroundColor: "#1F2937" },
        horzLine: { color: "rgba(255,255,255,0.2)", labelBackgroundColor: "#1F2937" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: intraday,
        secondsVisible: false,
        barSpacing: DEFAULT_BAR_SPACING,
        minBarSpacing: 0.4,
        rightOffset: 4,
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR,
      borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const renderTooltip = (param: import("lightweight-charts").MouseEventParams) => {
      const el = tooltipRef.current;
      const container = containerRef.current;
      if (!el || !container) return;
      const bar = param.seriesData.get(series) as
        | { open: number; high: number; low: number; close: number }
        | undefined;
      if (!param.point || param.time === undefined || !bar) {
        el.style.display = "none";
        return;
      }
      const extra = pointsByTimeRef.current.get(param.time as number);
      const { chg, chgPercent, rangePercent } = candleStats(bar);
      const up = chg >= 0;
      const dirClass = up ? "text-up" : "text-down";
      const rows: string[] = [
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">Time</span><span>${formatCandleTime(param.time as number, intraday)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">Open</span><span>${formatPrice(bar.open)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">High</span><span>${formatPrice(bar.high)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">Low</span><span>${formatPrice(bar.low)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">Close</span><span>${formatPrice(bar.close)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">Chg</span><span class="${dirClass}">${up ? "+" : ""}${formatNumber(chg)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">%Chg</span><span class="${dirClass}">${formatPercent(chgPercent)}</span></div>`,
        `<div class="flex justify-between gap-6"><span class="text-ink-muted">Range</span><span>${rangePercent.toFixed(2)}%</span></div>`,
      ];
      if (extra?.volume != null) {
        rows.push(`<div class="flex justify-between gap-6"><span class="text-ink-muted">Vol</span><span>${formatNumber(extra.volume)}</span></div>`);
      }
      if (extra?.quoteVolume != null) {
        rows.push(`<div class="flex justify-between gap-6"><span class="text-ink-muted">Txn</span><span>${formatCompactUsd(extra.quoteVolume).replace("$", "")}</span></div>`);
      }
      el.innerHTML = rows.join("");
      el.style.display = "block";

      const { clientWidth: cw, clientHeight: ch } = container;
      const tw = el.offsetWidth;
      const th = el.offsetHeight;
      let left = param.point.x + 16;
      if (left + tw > cw) left = param.point.x - tw - 16;
      left = Math.max(4, Math.min(left, cw - tw - 4));
      let top = param.point.y + 16;
      if (top + th > ch) top = Math.max(4, param.point.y - th - 16);
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    };
    chart.subscribeCrosshairMove(renderTooltip);

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // Recreate only when the axis mode flips (intraday vs. date).
  }, [intraday]);

  // Historical data: set once per interval/coin change, then show the most
  // recent window at a comfortable candle width (price scale auto-fits to it,
  // so candles have real height — not the squished full-range look).
  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || data.length === 0) return;

    const candles: CandlestickData<Time>[] = data.map((d) => ({
      time: d.time as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    series.setData(candles);
    pointsByTimeRef.current = new Map(data.map((d) => [d.time, d]));
    lastTimeRef.current = data[data.length - 1].time;

    // Show the last ~120 bars by default; the rest is scrollable.
    const visible = Math.min(data.length, 120);
    chart.timeScale().setVisibleLogicalRange({
      from: data.length - visible,
      to: data.length + 4,
    });
    void trend;
  }, [data, trend]);

  // Live candle: update the in-progress bar (or append a freshly closed one)
  // without resetting the whole series, so the chart ticks like Binance.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !liveCandle) return;
    // Ignore stale frames older than the loaded history's last bar.
    if (liveCandle.time < lastTimeRef.current) return;
    series.update({
      time: liveCandle.time as Time,
      open: liveCandle.open,
      high: liveCandle.high,
      low: liveCandle.low,
      close: liveCandle.close,
    });
    pointsByTimeRef.current.set(liveCandle.time, liveCandle);
    lastTimeRef.current = Math.max(lastTimeRef.current, liveCandle.time);
  }, [liveCandle]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[340px] w-full"
        role="img"
        aria-label="Candlestick price chart"
      />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-20 hidden min-w-[180px] rounded-lg border border-line bg-card/95 px-3 py-2 text-xs tabular-nums shadow-2xl backdrop-blur"
        style={{ display: "none" }}
        aria-hidden="true"
      />
    </div>
  );
}
