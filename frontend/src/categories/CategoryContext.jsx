import { useEffect, useState } from "react";
import { fetchCategories } from "./category.api";
import { CategoryContext } from "./categoryContext.shared";

let categoriesCache = null;
let categoriesRequestPromise = null;

function sortCategories(data) {
  return [...data].sort((a, b) => {
    if (a.slug === "other") return 1;
    if (b.slug === "other") return -1;
    return a.name.localeCompare(b.name);
  });
}

export function CategoryProvider({ children }) {
  const [categories, setCategories] = useState(() => categoriesCache ?? []);
  const [loading, setLoading] = useState(() => categoriesCache === null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    if (categoriesCache !== null) {
      return () => {
        isMounted = false;
      };
    }

    if (categoriesRequestPromise === null) {
      categoriesRequestPromise = fetchCategories().then(sortCategories);
    }

    categoriesRequestPromise
      .then((data) => {
        if (!isMounted) return;
        categoriesCache = data;
        setCategories(data);
        setError(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setCategories([]);
        setError("Failed to load categories: " + error.message);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <CategoryContext.Provider value={{ categories, loading, error }}>
      {children}
    </CategoryContext.Provider>
  );
}
