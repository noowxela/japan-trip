const PLACE_TYPE_EMOJI: Record<string, string> = {
  Sight: "⛩️",
  Food: "🍽️",
  Shop: "🛍️",
  Cafe: "☕",
  Other: "📍",
};

const TRANSIT_MODE_EMOJI: Record<string, string> = {
  Shinkansen: "🚅",
  Metro: "🚇",
  Bus: "🚌",
  Flight: "✈️",
  Walk: "🚶",
};

export function categoryEmoji(
  kind: "place" | "transit",
  chip: string | null | undefined,
): string | null {
  if (kind === "place") {
    if (!chip) return null;
    return PLACE_TYPE_EMOJI[chip] ?? "📍";
  }
  if (!chip) return "🚆";
  return TRANSIT_MODE_EMOJI[chip] ?? "🚆";
}
