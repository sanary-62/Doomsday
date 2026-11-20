import { useCallback, useEffect, useState } from 'react';

/**
 * Runs an async loader and tracks loading / error / data.
 * Re-runs when `deps` change or when `reload()` is called. Stale responses are ignored,
 * and the previous data stays on screen while a reload is in flight.
 */
export default function useApi(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    loader()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState((previous) => ({ ...previous, loading: false, error }));
      });

    return () => {
      cancelled = true;
    };
  }, [...deps, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);
  return { ...state, reload };
}
