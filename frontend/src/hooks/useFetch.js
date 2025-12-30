import { useEffect, useState } from "react";

// functions that start with 'use' are treated as React hooks
// React projects typically look for functions that start with use, and enforce certain rules on such functions.
// Rules like only calling hooks at the top level of a function component or another hook,
// for example, not nested inside an if statement.

// Every component that uses this hook gets its own independent state snapshots.
// So changing the state in one component will not affect the state of other components
export function useFetch(fetchFunction, initialValue) {
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState();
  const [fetchedData, setFetchedData] = useState(initialValue);

  useEffect(() => {
    async function fetchData() {
      setIsFetching(true);
      try {
        const data = await fetchFunction();
        setFetchedData(data);
      } catch (error) {
        setError({ message: error.message || "Failed to fetch data." });
      }

      setIsFetching(false);
    }

    fetchData();
  }, [fetchFunction]);
  // Need to add fetchFunction as dependency, because it could change, and it is change the effect needs to re-run.
  // Securing that the data is fetched based on the latest available fetch function.

  // can return an array or an object
  return {
    isFetching,
    fetchedData,
    setFetchedData,
    error,
  };
}
