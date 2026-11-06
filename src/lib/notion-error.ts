const NOTION_ERROR_CODE = /\bERROR\s+(\d+)\b/i;

/** Notion internal failures use `ERROR <digits>` as the API message. */
export function notionErrorCode(message: string | null | undefined): string | null {
  const match = message?.match(NOTION_ERROR_CODE);
  if (!match?.[1]) return null;
  return `ERROR ${match[1]}`;
}

export function isNotionInternalCode(message: string | null | undefined): boolean {
  return notionErrorCode(message) != null;
}
