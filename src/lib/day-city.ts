export type CityPropType = "select" | "multi_select";

/**
 * Notion `City` value for a day write. Live Days uses multi-select (travel days
 * list two cities); the app picks one, so keep the existing list when the
 * chosen city is already in it and only move it to the front.
 */
export function cityPropertyValue(
  type: CityPropType,
  city: string,
  current: string[] = [],
) {
  if (type === "select") {
    return { select: city ? { name: city } : null };
  }
  if (!city) return { multi_select: [] };
  const names = current.includes(city)
    ? [city, ...current.filter((name) => name !== city)]
    : [city];
  return { multi_select: names.map((name) => ({ name })) };
}
