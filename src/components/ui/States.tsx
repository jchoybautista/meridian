import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

/** Inline error message with optional retry. role="alert" for screen readers. */
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-down" aria-hidden="true" />
      <p className="text-ink-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-hover"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Empty placeholder with a heading, message, and optional action slot. */
export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <Inbox className="h-10 w-10 text-ink-muted" aria-hidden="true" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-ink-muted">{message}</p>
      {action}
    </div>
  );
}

/** Skeleton grid used while price cards load. */
export function CardSkeletonGrid({ count = 5 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card h-[116px] p-4">
          <div className="skeleton h-9 w-9 rounded-full" />
          <div className="skeleton mt-3 h-4 w-2/3 rounded" />
          <div className="skeleton mt-2 h-5 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Generic loading line for screen readers paired with skeletons. */
export function LoadingAnnounce({ label }: { label: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}
