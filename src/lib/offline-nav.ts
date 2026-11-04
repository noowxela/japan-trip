type ClickLike = Pick<
  MouseEvent,
  "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "defaultPrevented"
> & { target: EventTarget | null };

type AnchorLike = {
  closest?: (selector: string) => unknown;
};

/**
 * For a click on the offline fallback page: the same-origin href to load as a
 * full document navigation, or null to leave the click alone (modified
 * clicks, other origins, new tabs, downloads, hash-only links).
 */
export function hardNavigationHref(
  event: ClickLike,
  origin: string,
): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  const target = event.target as AnchorLike | null;
  const anchor = target?.closest?.("a[href]") as
    | { getAttribute(name: string): string | null; href: string }
    | null
    | undefined;
  if (!anchor) return null;
  const targetAttr = anchor.getAttribute("target");
  if ((targetAttr && targetAttr !== "_self") || anchor.getAttribute("download") !== null) {
    return null;
  }
  const raw = anchor.getAttribute("href") ?? "";
  if (raw.startsWith("#")) return null;
  let url: URL;
  try {
    url = new URL(anchor.href || raw, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  return url.pathname + url.search + url.hash;
}
