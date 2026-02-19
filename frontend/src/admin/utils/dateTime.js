function pad2(value) {
  return String(value).padStart(2, "0");
}

function toYmdHis(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

export function formatAdminDateTime(value) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  const raw = String(value).trim();
  if (raw === "") {
    return "n/a";
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  if (/^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)) {
    return raw.replace(/\./g, "-");
  }

  const normalized = raw
    .replace("T", " ")
    .replace(/\.\d+/, "")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");

  const parsed = Date.parse(normalized.replace(" ", "T"));
  if (!Number.isNaN(parsed)) {
    return toYmdHis(new Date(parsed));
  }

  const fallback = raw
    .replace(/\.\d+/, "")
    .replace(/([+-]\d{2}:?\d{2}|Z)$/i, "")
    .replace("T", " ")
    .trim();

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(fallback)) {
    return fallback;
  }

  return raw;
}
