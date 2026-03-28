import { useState, useCallback } from 'react';

/**
 * Generic hook for API calls.
 * Usage: const { data, loading, error, execute } = useApi(myApiFn);
 */
export function useApi(apiFn) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFn(...args);
      setData(response.data);
      return response.data;
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiFn]);

  return { data, loading, error, execute };
}
