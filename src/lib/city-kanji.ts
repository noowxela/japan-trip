const CITY_KANJI: Record<string, string> = {
  Tokyo: "東京",
  Kyoto: "京都",
  Osaka: "大阪",
  Nara: "奈良",
  东京: "東京",
  京都: "京都",
  大阪: "大阪",
  奈良: "奈良",
  東京: "東京",
};

/** Return kanji for a known city name (en/zh/ja), or null if unknown. */
export function cityKanji(city: string | null | undefined): string | null {
  if (!city) return null;
  const trimmed = city.trim();
  if (!trimmed) return null;
  if (CITY_KANJI[trimmed]) return CITY_KANJI[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [key, kanji] of Object.entries(CITY_KANJI)) {
    if (key.toLowerCase() === lower) return kanji;
  }
  return null;
}
