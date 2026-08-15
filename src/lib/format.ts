export function formatDay(date: string | null) {
  if (!date) return "No date";
  const day = date.slice(0, 10);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${day}T12:00:00`));
}

export function formatRange(start: string | null, end: string | null) {
  if (!start && !end) return "Dates TBD";
  if (start && end) return `${formatDay(start)} → ${formatDay(end)}`;
  return formatDay(start ?? end);
}

export function formatTime(start: string | null) {
  if (!start || !start.includes("T")) return null;
  const time = start.slice(11, 16);
  return time || null;
}

export function formatYen(amount: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function tokyoToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

export function dateKey(value: string | null) {
  return value ? value.slice(0, 10) : null;
}
