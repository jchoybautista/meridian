import { Radio } from "lucide-react";

/** Small pulsing "Live" indicator shown when a realtime stream is connected. */
export function LiveDot({ label = "Live" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-up" role="status">
      <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" />
      {label}
    </span>
  );
}
