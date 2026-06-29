import { useEffect, useRef, useState, useCallback } from "react";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
} from "lightweight-charts";
import type { OHLCPoint } from "../../lib/coingecko";
import { candleStats, formatCandleTime } from "../../lib/candle";
import { formatPrice, formatNumber, formatCompactUsd, formatPercent } from "../../lib/format";

interface Props {
  data: OHLCPoint[];
  trend: "up" | "down" | "flat";
  liveCandle?: OHLCPoint | null;
  intraday?: boolean;
}

const UP_COLOR   = "#22C55E";
const DOWN_COLOR = "#EF4444";
const UP_VOL     = "rgba(34,197,94,0.45)";
const DOWN_VOL   = "rgba(239,68,68,0.45)";

const DEFAULT_BAR_SPACING = 9;
const HANDLE_HEIGHT       = 6;   // px — drag zone between panes
const MIN_VOL_HEIGHT      = 40;  // px
const MAX_VOL_HEIGHT      = 240; // px
const DEFAULT_VOL_HEIGHT  = 110; // px

const CHART_OPTS = {
  layout: {
    background: { color: "transparent" },
    textColor: "#9CA3AF",
    attributionLogo: false,
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
  handleScroll: true,
  handleScale: true,
};

/** Format a raw volume number for the VOL label (e.g. 1612 → "1.61K") */
function fmtVol(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(2)}K`;
  return v.toFixed(2);
}

export function CandlestickChart({ data, trend, liveCandle, intraday = false }: Props) {
  // ── container refs ──────────────────────────────────────────────────────────
  const candleContainerRef = useRef<HTMLDivElement>(null);
  const volContainerRef    = useRef<HTMLDivElement>(null);
  const handleRef          = useRef<HTMLDivElement>(null);
  const tooltipRef         = useRef<HTMLDivElement>(null);

  // ── chart / series refs ─────────────────────────────────────────────────────
  const candleChartRef  = useRef<IChartApi | null>(null);
  const volChartRef     = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volSeriesRef    = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lastTimeRef     = useRef<number>(0);
  const pointsByTimeRef = useRef<Map<number, OHLCPoint>>(new Map());
  const syncingRef      = useRef(false);

  // ── vol label state ─────────────────────────────────────────────────────────
  const [volLabel, setVolLabel] = useState<string | null>(null);

  // ── resize state ────────────────────────────────────────────────────────────
  const [volHeight, setVolHeight] = useState(DEFAULT_VOL_HEIGHT);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  // ── drag handle logic ───────────────────────────────────────────────────────
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startY - e.clientY; // drag up → bigger vol
    const next  = Math.min(MAX_VOL_HEIGHT, Math.max(MIN_VOL_HEIGHT, dragRef.current.startH + delta));
    setVolHeight(next);
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [onMouseMove]);

  const onHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startH: volHeight };
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [volHeight, onMouseMove, onMouseUp]);

  // ── create / destroy candle chart ───────────────────────────────────────────
  useEffect(() => {
    if (!candleContainerRef.current) return;

    const chart = createChart(candleContainerRef.current, {
      ...CHART_OPTS,
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: intraday,
        secondsVisible: false,
        barSpacing: DEFAULT_BAR_SPACING,
        minBarSpacing: 0.4,
        rightOffset: 4,
        visible: false, // time axis shown only on the volume chart below
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR, downColor: DOWN_COLOR,
      borderUpColor: UP_COLOR, borderDownColor: DOWN_COLOR,
      wickUpColor: UP_COLOR,   wickDownColor: DOWN_COLOR,
    });

    candleChartRef.current  = chart;
    candleSeriesRef.current = series;

    // Tooltip
    const renderTooltip = (param: import("lightweight-charts").MouseEventParams) => {
      const el        = tooltipRef.current;
      const container = candleContainerRef.current;
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
      const up       = chg >= 0;
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
      if (extra?.volume != null)      rows.push(`<div class="flex justify-between gap-6"><span class="text-ink-muted">Vol</span><span>${formatNumber(extra.volume)}</span></div>`);
      if (extra?.quoteVolume != null) rows.push(`<div class="flex justify-between gap-6"><span class="text-ink-muted">Txn</span><span>${formatCompactUsd(extra.quoteVolume).replace("$", "")}</span></div>`);
      el.innerHTML      = rows.join("");
      el.style.display  = "block";

      const { clientWidth: cw, clientHeight: ch } = container;
      const tw = el.offsetWidth, th = el.offsetHeight;
      let left = param.point.x + 16;
      if (left + tw > cw) left = param.point.x - tw - 16;
      left = Math.max(4, Math.min(left, cw - tw - 4));
      let top = param.point.y + 16;
      if (top + th > ch) top = Math.max(4, param.point.y - th - 16);
      el.style.left = `${left}px`;
      el.style.top  = `${top}px`;
    };
    chart.subscribeCrosshairMove(renderTooltip);

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (candleContainerRef.current)
        chart.applyOptions({ width: candleContainerRef.current.clientWidth });
    });
    ro.observe(candleContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      candleChartRef.current  = null;
      candleSeriesRef.current = null;
    };
  }, [intraday]);

  // ── create / destroy volume chart ────────────────────────────────────────────
  useEffect(() => {
    if (!volContainerRef.current) return;

    const chart = createChart(volContainerRef.current, {
      ...CHART_OPTS,
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.06)",
        scaleMargins: { top: 0.1, bottom: 0 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.06)",
        timeVisible: intraday,
        secondsVisible: false,
        barSpacing: DEFAULT_BAR_SPACING,
        minBarSpacing: 0.4,
        rightOffset: 4,
      },
      // No horizontal crosshair line on vol chart — cleaner look
      crosshair: {
        ...CHART_OPTS.crosshair,
        horzLine: { visible: false, labelVisible: false },
      },
    });

    const series = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      color: UP_VOL,
    });

    volChartRef.current  = chart;
    volSeriesRef.current = series;

    // Update VOL label on crosshair move
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) { setVolLabel(null); return; }
      const bar = param.seriesData.get(series) as { value?: number } | undefined;
      if (bar?.value != null) setVolLabel(fmtVol(bar.value));
      else setVolLabel(null);
    });

    const ro = new ResizeObserver(() => {
      if (volContainerRef.current)
        chart.applyOptions({ width: volContainerRef.current.clientWidth });
    });
    ro.observe(volContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      volChartRef.current  = null;
      volSeriesRef.current = null;
    };
  }, [intraday]);

  // ── sync time scales between the two charts ──────────────────────────────────
  useEffect(() => {
    const candleChart = candleChartRef.current;
    const volChart    = volChartRef.current;
    if (!candleChart || !volChart) return;

    const onCandleRange = (range: import("lightweight-charts").LogicalRange | null) => {
      if (syncingRef.current || !range) return;
      syncingRef.current = true;
      volChart.timeScale().setVisibleLogicalRange(range);
      syncingRef.current = false;
    };
    const onVolRange = (range: import("lightweight-charts").LogicalRange | null) => {
      if (syncingRef.current || !range) return;
      syncingRef.current = true;
      candleChart.timeScale().setVisibleLogicalRange(range);
      syncingRef.current = false;
    };

    candleChart.timeScale().subscribeVisibleLogicalRangeChange(onCandleRange);
    volChart.timeScale().subscribeVisibleLogicalRangeChange(onVolRange);

    return () => {
      candleChart.timeScale().unsubscribeVisibleLogicalRangeChange(onCandleRange);
      volChart.timeScale().unsubscribeVisibleLogicalRangeChange(onVolRange);
    };
  // Re-subscribe whenever charts recreate (intraday flip).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candleChartRef.current, volChartRef.current]);

  // ── set historical data ──────────────────────────────────────────────────────
  useEffect(() => {
    const candleChart  = candleChartRef.current;
    const candleSeries = candleSeriesRef.current;
    const volSeries    = volSeriesRef.current;
    if (!candleChart || !candleSeries || data.length === 0) return;

    const candles: CandlestickData<Time>[] = data.map((d) => ({
      time: d.time as Time, open: d.open, high: d.high, low: d.low, close: d.close,
    }));
    candleSeries.setData(candles);
    pointsByTimeRef.current = new Map(data.map((d) => [d.time, d]));
    lastTimeRef.current     = data[data.length - 1].time;

    if (volSeries) {
      const hasVol = data.some((d) => d.volume != null);
      if (hasVol) {
        const volData: HistogramData<Time>[] = data.map((d) => ({
          time:  d.time as Time,
          value: d.volume ?? 0,
          color: d.close >= d.open ? UP_VOL : DOWN_VOL,
        }));
        volSeries.setData(volData);
        // Default vol label = last bar
        const last = data[data.length - 1];
        if (last.volume != null) setVolLabel(fmtVol(last.volume));
      } else {
        volSeries.setData([]);
      }
    }

    const visible = Math.min(data.length, 120);
    candleChart.timeScale().setVisibleLogicalRange({
      from: data.length - visible,
      to:   data.length + 4,
    });
    void trend;
  }, [data, trend]);

  // ── live candle updates ──────────────────────────────────────────────────────
  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const volSeries    = volSeriesRef.current;
    if (!candleSeries || !liveCandle) return;
    if (liveCandle.time < lastTimeRef.current) return;

    candleSeries.update({
      time: liveCandle.time as Time,
      open: liveCandle.open, high: liveCandle.high,
      low:  liveCandle.low,  close: liveCandle.close,
    });

    if (volSeries && liveCandle.volume != null) {
      volSeries.update({
        time:  liveCandle.time as Time,
        value: liveCandle.volume,
        color: liveCandle.close >= liveCandle.open ? UP_VOL : DOWN_VOL,
      });
      setVolLabel(fmtVol(liveCandle.volume));
    }

    pointsByTimeRef.current.set(liveCandle.time, liveCandle);
    lastTimeRef.current = Math.max(lastTimeRef.current, liveCandle.time);
  }, [liveCandle]);

  // ── resize charts when volHeight changes ─────────────────────────────────────
  useEffect(() => {
    if (volContainerRef.current && volChartRef.current) {
      volChartRef.current.applyOptions({ height: volHeight });
    }
  }, [volHeight]);

  return (
    <div className="relative w-full select-none">
      {/* ── Candlestick pane ── */}
      <div className="relative">
        <div
          ref={candleContainerRef}
          className="w-full"
          style={{ height: 290 }}
          role="img"
          aria-label="Candlestick price chart"
        />
        {/* Floating tooltip */}
        <div
          ref={tooltipRef}
          className="pointer-events-none absolute z-20 hidden min-w-[180px] rounded-lg border border-line bg-card/95 px-3 py-2 text-xs tabular-nums shadow-2xl backdrop-blur"
          style={{ display: "none" }}
          aria-hidden="true"
        />
      </div>

      {/* ── Drag handle ── */}
      <div
        ref={handleRef}
        onMouseDown={onHandleMouseDown}
        className="group relative flex cursor-ns-resize items-center justify-center border-y border-line bg-elevated/60 hover:bg-elevated"
        style={{ height: HANDLE_HEIGHT }}
        aria-label="Drag to resize volume panel"
        role="separator"
      >
        <div className="h-0.5 w-8 rounded-full bg-line group-hover:bg-ink-muted transition-colors" />
      </div>

      {/* ── Volume pane ── */}
      <div className="relative" style={{ height: volHeight }}>
        {/* VOL label */}
        <div className="pointer-events-none absolute left-2 top-1.5 z-10 flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
          <span className="font-semibold text-ink">VOL</span>
          {volLabel && (
            <span className="tabular-nums text-ink-muted">{volLabel}</span>
          )}
        </div>
        <div
          ref={volContainerRef}
          className="w-full"
          style={{ height: volHeight }}
          role="img"
          aria-label="Volume histogram"
        />
      </div>
    </div>
  );
}
