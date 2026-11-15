const NOTION_ERROR_CODE = /\bERROR\s+(\d+)\b/i;

/** Notion property names used when pasting a Maps link onto a stay. */
export const STAY_MAPS_PROP_NAMES = ["Maps URL", "Lat", "Lng"] as const;

/** Notion internal failures use `ERROR <digits>` as the API message. */
export function notionErrorCode(message: string | null | undefined): string | null {
  const match = message?.match(NOTION_ERROR_CODE);
  if (!match?.[1]) return null;
  return `ERROR ${match[1]}`;
}

export function isNotionInternalCode(message: string | null | undefined): boolean {
  return notionErrorCode(message) != null;
}

/**
 * True when Notion rejected a write because Stays is missing Maps URL / Lat / Lng
 * (or named them in a validation message). Used so stay save returns a toast
 * instead of throwing into a production React #441 digest.
 */
export function isStayMapsSchemaError(error: unknown): boolean {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";
  if (!message) return false;
  const lower = message.toLowerCase();
  // Notion validation usually looks like:
  //   "Maps URL is not a property that exists."
  //   "Lat is not a property that exists."
  return STAY_MAPS_PROP_NAMES.some((name) => {
    const n = name.toLowerCase();
    return (
      lower.includes(n) &&
      (lower.includes("is not a property") ||
        lower.includes("property") ||
        lower.includes("validation"))
    );
  });
}
