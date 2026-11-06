const HAS_TZ_OFFSET = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

export type NotionDateValue = {
  date: { start: string; time_zone?: "Asia/Tokyo" } | null;
};

/**
 * Notion date writes accept either an offset timestamp or a wall time plus
 * `time_zone`, never both. Combining them makes page create fail with an
 * internal `ERROR <id>` (seen live as `ERROR 1112746976`) instead of saving.
 */
export function notionStartProperty(start: string | null | undefined): NotionDateValue {
  const value = start?.trim() ?? "";
  if (!value) return { date: null };
  if (!value.includes("T")) return { date: { start: value.slice(0, 10) } };
  if (HAS_TZ_OFFSET.test(value)) return { date: { start: value } };
  return { date: { start: value, time_zone: "Asia/Tokyo" } };
}
