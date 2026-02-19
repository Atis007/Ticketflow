import { useContext } from "react";

import { CategoryContext } from "./categoryContext.shared";

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error("useCategories must be used within a CategoryProvider");
  }

  return context;
}
