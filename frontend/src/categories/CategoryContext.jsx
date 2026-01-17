import { createContext, useEffect, useState, useContext } from "react";
import { fetchCategories } from "./category.api";

const CategoryContext = createContext(null);

export function CategoryProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories()
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          if (a.slug === "other") return 1;
          if (b.slug === "other") return -1;
          return a.name.localeCompare(b.name);
        });
        setCategories(sorted);
      })
      .catch((error) => {
        setCategories([]);
        throw new Error("Failed to load categories: " + error.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <CategoryContext.Provider value={{ categories, loading }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error("useCategories must be used within a CategoryProvider");
  }

  return context;
}
