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

/** Spend categories — overlap Food/Shop/Other with Schedule place emoji. */
const SPEND_CATEGORY_EMOJI: Record<string, string> = {
  Food: "🍽️",
  Transit: "🚆",
  "Ride-hailing": "🚗",
  Airfare: "✈️",
  Stay: "🏨",
  Ticket: "🎫",
  Shop: "🛍️",
  Other: "📦",
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

/** Compact Spending row emoji — same size/style class as Schedule. */
export function spendCategoryEmoji(category: string | null | undefined): string {
  if (!category) return SPEND_CATEGORY_EMOJI.Other;
  return SPEND_CATEGORY_EMOJI[category] ?? SPEND_CATEGORY_EMOJI.Other;
}
