import { useCallback, useMemo, useState } from "react";

export function useDataGridState({ initialPageSize = 20 } = {}) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});

  const selectedCount = useMemo(
    () => Object.values(rowSelection).filter(Boolean).length,
    [rowSelection],
  );

  const resetSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  return {
    pagination,
    setPagination,
    sorting,
    setSorting,
    rowSelection,
    setRowSelection,
    selectedCount,
    resetSelection,
  };
}
