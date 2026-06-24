import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

/** Consistent page title block. */
export function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
