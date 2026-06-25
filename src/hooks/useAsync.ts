import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface AsyncOptions {
  /** When set, silently refetch on this interval while the tab is visible. */
  pollMs?: number;
}

/**
 * Runs an async function on mount and whenever `deps` change, tracking
 * loading/error state and exposing a manual `reload`. With `options.pollMs`,
 * it also refetches in the background (no loading flash) while the document is
 * visible, and immediately when the tab becomes visible again.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  options: AsyncOptions = {},
): AsyncState<T> {
  const { pollMs } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  // Keep the latest fn without forcing the polling effect to re-subscribe.
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fnRef.current()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  useEffect(() => {
    if (!pollMs) return;
    let cancelled = false;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      fnRef.current()
        .then((result) => { if (!cancelled) setData(result); })
        .catch(() => { /* keep showing last good data on a failed poll */ });
    };
    const timer = setInterval(refresh, pollMs);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, ...deps]);

  return { data, loading, error, reload };
}
