import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  /** Optional "see all" link shown as an arrow in the header. */
  to?: string;
  className?: string;
  children: ReactNode;
}

/** Standard dashboard card with a titled header and optional link arrow. */
export function Panel({ title, subtitle, to, className = "", children }: Props) {
  return (
    <section className={`card flex flex-col overflow-hidden p-4 ${className}`}>
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-bold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
        </div>
        {to && (
          <Link
            to={to}
            className="rounded-md p-1 text-ink-muted hover:bg-elevated hover:text-ink"
            aria-label={`View all ${title}`}
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
    </section>
  );
}
