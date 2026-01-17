const baseUrl = import.meta.env.VITE_API_BASE_URL;

export async function fetchCategories() {
  const res = await fetch(`${baseUrl}categories`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();

  if (!json.success) {
    throw new Error("Failed to load categories");
  }

  return json.data;
}
