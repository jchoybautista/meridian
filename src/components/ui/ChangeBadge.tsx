import { TrendingDown, TrendingUp } from "lucide-react";
import { changeDirection, formatPercent } from "../../lib/format";

interface Props {
  value: number | null | undefined;
  /** Show the trend arrow icon. */
  withIcon?: boolean;
  size?: "sm" | "md";
}

/**
 * Coloured percent-change indicator. Colour alone never conveys meaning —
 * the +/- sign and (optional) arrow icon carry it too (WCAG 1.4.1).
 */
export function ChangeBadge({ value, withIcon = true, size = "sm" }: Props) {
  const dir = changeDirection(value);
  const color =
    dir === "up" ? "text-up" : dir === "down" ? "text-down" : "text-ink-muted";
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : null;
  const text = size === "sm" ? "text-sm" : "text-base";

  return (
    <span className={`inline-flex items-center gap-1 font-medium ${color} ${text}`}>
      {withIcon && Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {formatPercent(value)}
      <span className="sr-only">
        {dir === "up" ? " increase" : dir === "down" ? " decrease" : " no change"}
      </span>
    </span>
  );
}
