import { useState } from "react";

export function useAsync(asyncFunction, initialValue) {
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(initialValue);

  async function execute(...args) {
    setIsFetching(true);
    setError(null);

    try {
      const result = await asyncFunction(...args);
      setData(result);
      return result;
    } catch (error) {
      setError({ message: error.message || "Request failed." });
      throw error;
    } finally {
      setIsFetching(false);
    }
  }

  return {
    execute,
    isFetching,
    data,
    error,
    setData
  };
}
