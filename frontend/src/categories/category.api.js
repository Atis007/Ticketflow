const baseUrl = import.meta.env.VITE_API_BASE_URL;

function withTrailingSlash(url = "") {
  return url.endsWith("/") ? url : `${url}/`;
}

export async function fetchCategories() {
  const res = await fetch(`${withTrailingSlash(baseUrl)}categories`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed with ${res.status}`);
  }

  const json = await res.json().catch(() => null);

  if (!json?.success || !Array.isArray(json?.data)) {
    throw new Error("Failed to load categories");
  }

  return json.data;
}
