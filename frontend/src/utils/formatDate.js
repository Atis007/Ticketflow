export function formatEventDate(raw) {
  if (!raw) return "Date TBA";
  const normalized = String(raw).replace(" ", "T").replace(/\./g, "-");
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
