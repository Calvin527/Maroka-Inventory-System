import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../api/client";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Loads data and re-loads whenever `deps` change. Ignores stale responses
 * so fast typing in a search box never shows an older result.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const reload = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    loader()
      .then((result) => {
        if (id === requestId.current) {
          setData(result);
          setError(null);
        }
      })
      .catch((e) => {
        if (id === requestId.current) setError(errorMessage(e));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
