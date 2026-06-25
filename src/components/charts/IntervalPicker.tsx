import { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";

// ─── Interval definitions ─────────────────────────────────────────────────────
//
// Crypto candles come from Binance's free klines API, which returns real OHLC
// candles for each native interval with full history (e.g. monthly BTC candles
// back to Aug 2017). Labels follow the user's notation: m = minutes,
// h = hours, D = days, W = weeks, M = months. `intraday` controls whether the
// time axis shows time-of-day. Each interval loads its most-recent ~1000 candles
// (1W/1M/3D span full listing history; 1D spans several years).

export interface Interval {
  label: string;
  /** Each candle represents this period. */
  note: string;
  /** Sub-daily interval → show time-of-day on the axis. */
  intraday: boolean;
  /** Twelve Data interval string (stocks only). */
  tdInterval?: string;
}

export const CRYPTO_INTERVALS: Interval[] = [
  { label: "1m",  note: "1-minute candles",  intraday: true },
  { label: "3m",  note: "3-minute candles",  intraday: true },
  { label: "5m",  note: "5-minute candles",  intraday: true },
  { label: "15m", note: "15-minute candles", intraday: true },
  { label: "30m", note: "30-minute candles", intraday: true },
  { label: "1h",  note: "1-hour candles",    intraday: true },
  { label: "2h",  note: "2-hour candles",    intraday: true },
  { label: "4h",  note: "4-hour candles",    intraday: true },
  { label: "6h",  note: "6-hour candles",    intraday: true },
  { label: "8h",  note: "8-hour candles",    intraday: true },
  { label: "12h", note: "12-hour candles",   intraday: true },
  { label: "1D",  note: "Daily candles",     intraday: false },
  { label: "3D",  note: "3-day candles",     intraday: false },
  { label: "1W",  note: "Weekly candles · full history", intraday: false },
  { label: "1M",  note: "Monthly candles · full history", intraday: false },
];

export const STOCK_INTERVALS: Interval[] = [
  { label: "15m", tdInterval: "15min",  note: "15-minute candles",            intraday: true  },
  { label: "1h",  tdInterval: "1h",     note: "1-hour candles",               intraday: true  },
  { label: "4h",  tdInterval: "4h",     note: "4-hour candles",               intraday: true  },
  { label: "1D",  tdInterval: "1day",   note: "Daily candles",                intraday: false },
  { label: "1W",  tdInterval: "1week",  note: "Weekly candles",               intraday: false },
  { label: "1M",  tdInterval: "1month", note: "Monthly candles · full history", intraday: false },
];

export function getIntervalByLabel(label: string, intervals: Interval[]): Interval {
  return intervals.find((i) => i.label === label) ?? intervals[0];
}

const DEFAULT_CRYPTO_PREFERRED = ["15m", "1h", "4h", "1D"];
export const DEFAULT_STOCK_PREFERRED  = ["1h", "4h", "1D", "1W"];
export const CRYPTO_STORAGE_KEY = "meridian:chart:intervals";
export const STOCK_STORAGE_KEY  = "meridian:chart:stock-intervals";

interface Props {
  value: string;
  onChange: (interval: Interval) => void;
  intervals?: Interval[];
  storageKey?: string;
  defaultPreferred?: string[];
}

export function IntervalPicker({
  value,
  onChange,
  intervals = CRYPTO_INTERVALS,
  storageKey = CRYPTO_STORAGE_KEY,
  defaultPreferred = DEFAULT_CRYPTO_PREFERRED,
}: Props) {
  const [preferred, setPreferred] = useState<string[]>(() => {
    const validLabels = new Set(intervals.map((i) => i.label));
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaultPreferred;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        // Drop any labels no longer offered (e.g. from an earlier interval set).
        const cleaned = (parsed as string[]).filter((l) => validLabels.has(l));
        if (cleaned.length > 0) return cleaned;
      }
    } catch { /* ignore */ }
    return defaultPreferred;
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen]);

  // The first N quick tabs (all preferred labels, up to 4 for the fixed row)
  // The 5th slot is the "More / custom" dropdown button
  const quickTabs = preferred.length >= 5 ? preferred.slice(0, 4) : preferred;
  const customSlot = preferred.length >= 5 ? preferred[preferred.length - 1] : null;
  const isCustomActive = customSlot !== null && value === customSlot;

  const selectInterval = (label: string) => {
    onChange(getIntervalByLabel(label, intervals));
  };

  const handleDropdownPick = (label: string) => {
    selectInterval(label);
    // Pin it as the 5th slot
    const newPref = [...preferred.slice(0, 4), label];
    setPreferred(newPref);
    try { localStorage.setItem(storageKey, JSON.stringify(newPref)); } catch { /* ignore */ }
    setIsOpen(false);
  };

  const openDropdown = () => {
    setIsEditing(false);
    setIsOpen((o) => !o);
  };

  const startEdit = () => {
    setEditDraft([...preferred]);
    setIsEditing(true);
  };

  const toggleDraft = (label: string) => {
    setEditDraft((prev) => {
      if (prev.includes(label)) return prev.filter((l) => l !== label);
      if (prev.length >= 5) return prev;
      return [...prev, label];
    });
  };

  const saveDraft = () => {
    const next = editDraft.length > 0 ? editDraft : defaultPreferred;
    setPreferred(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
    // If current interval isn't in the new set, switch to first
    if (!next.includes(value)) selectInterval(next[0]);
    setIsEditing(false);
    setIsOpen(false);
  };

  const currentInterval = getIntervalByLabel(value, intervals);

  return (
    <div className="relative flex items-center gap-1" ref={panelRef}>
      {/* Quick tab row */}
      <div role="tablist" aria-label="Chart interval" className="flex gap-0.5">
        {quickTabs.map((label) => (
          <button
            key={label}
            role="tab"
            aria-selected={value === label}
            onClick={() => selectInterval(label)}
            className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
              value === label
                ? "bg-brand text-white"
                : "text-ink-muted hover:bg-elevated hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 5th slot / More button */}
      <button
        onClick={openDropdown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`inline-flex items-center gap-0.5 rounded-md px-3 py-1 text-xs font-bold transition-colors ${
          isCustomActive
            ? "bg-brand text-white"
            : "text-ink-muted hover:bg-elevated hover:text-ink"
        }`}
      >
        {customSlot ?? "More"}
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-line bg-card p-4 shadow-2xl"
          role="listbox"
          aria-label="Select chart interval"
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold">
              {isEditing ? (
                <>
                  Preferred intervals{" "}
                  <span className="text-brand">
                    {editDraft.length}/5
                  </span>
                </>
              ) : (
                "Intervals"
              )}
            </span>
            {isEditing ? (
              <button
                onClick={saveDraft}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Done
              </button>
            ) : (
              <button
                onClick={startEdit}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          {/* Interval grid (4 columns like Binance) */}
          <div className="grid grid-cols-4 gap-1.5">
            {intervals.map((interval) => {
              const isActive = !isEditing && value === interval.label;
              const inDraft = isEditing && editDraft.includes(interval.label);
              const draftFull = isEditing && editDraft.length >= 5 && !inDraft;

              return (
                <button
                  key={interval.label}
                  role="option"
                  aria-selected={isActive}
                  onClick={() =>
                    isEditing ? toggleDraft(interval.label) : handleDropdownPick(interval.label)
                  }
                  disabled={draftFull}
                  className={`relative rounded-lg py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-brand text-white"
                      : inDraft
                        ? "border border-brand bg-brand/15 text-brand"
                        : draftFull
                          ? "cursor-not-allowed text-ink-muted/30"
                          : "border border-line bg-elevated text-ink-muted hover:border-brand/60 hover:text-ink"
                  }`}
                >
                  {interval.label}
                  {inDraft && (
                    <Check
                      className="absolute right-0.5 top-0.5 h-2.5 w-2.5 text-brand"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Data note */}
          {!isEditing && (
            <p className="mt-3 text-[10px] leading-relaxed text-ink-muted">
              {currentInterval.note}
              {intervals === CRYPTO_INTERVALS
                ? " · live via Binance. 1W / 1M show full history back to listing."
                : " · data via Twelve Data."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
