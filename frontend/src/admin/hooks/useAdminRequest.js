import { useCallback, useRef, useState } from "react";

export function useAdminRequest(initialData = null) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const callIdRef = useRef(0);

  const run = useCallback(async (requestFn) => {
    const currentCallId = callIdRef.current + 1;
    callIdRef.current = currentCallId;

    setLoading(true);
    setError(null);

    try {
      const result = await requestFn();

      if (callIdRef.current === currentCallId) {
        setData(result);
      }

      return result;
    } catch (requestError) {
      if (callIdRef.current === currentCallId) {
        setError(requestError);
      }

      throw requestError;
    } finally {
      if (callIdRef.current === currentCallId) {
        setLoading(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
  }, [initialData]);

  return {
    data,
    error,
    loading,
    setData,
    run,
    reset,
  };
}
