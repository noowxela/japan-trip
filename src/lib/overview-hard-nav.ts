import { hardNavigationHref } from "@/lib/offline-nav";

type ClickLike = Parameters<typeof hardNavigationHref>[0];

/**
 * On the Overview route, same-origin links to another page should be a full
 * document load. Client (RSC) navigation from `/` can start but never commit
 * on this PWA, while tab switches between other routes work.
 *
 * Returns the href to `location.assign`, or null to leave the click alone.
 */
export function overviewHardNavHref(
  event: ClickLike,
  origin: string,
  currentPath: string,
): string | null {
  if (currentPath !== "/") return null;
  const href = hardNavigationHref(event, origin);
  if (!href) return null;
  const url = new URL(href, origin);
  if (url.pathname === "/" && url.search === "") return null;
  return href;
}
