import { formatTime } from "@/lib/format";
import type { AgendaItem } from "@/lib/types";

/** Plain-text day agenda for Web Share / clipboard. */
export function formatDayShareText(input: {
  dayName: string;
  dateLabel: string | null;
  items: AgendaItem[];
  appUrl?: string;
}): string {
  const header = [input.dayName, input.dateLabel].filter(Boolean).join(" · ");
  const lines = input.items.map((item) => {
    const time = formatTime(item.start) ?? "—";
    const chip = item.chip ? ` (${item.chip})` : "";
    return `${time} ${item.name}${chip}`;
  });
  const body = lines.length > 0 ? lines.join("\n") : "";
  return [header, body, input.appUrl].filter(Boolean).join("\n");
}
