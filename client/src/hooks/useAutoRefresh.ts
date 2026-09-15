import { useState, useEffect, useCallback, useRef } from 'react';

interface AutoRefreshState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastRefreshed: Date | null;
  /** Time elapsed in seconds since last refresh */
  secondsSince: number;
  /** Manually trigger a refresh */
  refresh: () => void;
}

/**
 * useAutoRefresh — Like useAsync but re-fetches on a set interval.
 *
 * @param fetchFn  The async function to call
 * @param intervalMs  How often to re-fetch in milliseconds (default 30 000 = 30s)
 * @param enabled  Set to false to pause auto-refresh (e.g. when a modal is open)
 */
export function useAutoRefresh<T>(
  fetchFn: () => Promise<T>,
  intervalMs = 30_000,
  enabled = true,
): AutoRefreshState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [secondsSince, setSecondsSince] = useState(0);
  const isMountedRef = useRef(true);
  const fetchFnRef = useRef(fetchFn);

  // Keep fetchFn ref updated without triggering effect re-run
  useEffect(() => { fetchFnRef.current = fetchFn; }, [fetchFn]);

  const doFetch = useCallback(async () => {
    try {
      const result = await fetchFnRef.current();
      if (!isMountedRef.current) return;
      setData(result);
      setError(null);
      setLastRefreshed(new Date());
      setSecondsSince(0);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    doFetch();
    return () => { isMountedRef.current = false; };
  }, [doFetch]);

  // Interval refetch
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(doFetch, intervalMs);
    return () => clearInterval(id);
  }, [doFetch, intervalMs, enabled]);

  // Tick counter: how many seconds since last refresh
  useEffect(() => {
    if (!lastRefreshed) return;
    const tick = setInterval(() => {
      setSecondsSince(Math.floor((Date.now() - lastRefreshed.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastRefreshed]);

  return { data, loading, error, lastRefreshed, secondsSince, refresh: doFetch };
}
