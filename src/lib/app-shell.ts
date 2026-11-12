export const APP_SCROLL_ID = "app-scroll";

export function getAppScrollElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(APP_SCROLL_ID);
}

export function getAppScrollTop(from?: Element | null): number {
  const scroller = getAppScrollElement();
  if (scroller) return scroller.scrollTop;
  if (typeof window === "undefined") return 0;
  let total = window.scrollY;
  let node: HTMLElement | null =
    from instanceof HTMLElement ? from : (from?.parentElement ?? null);
  while (node && node !== document.body && node !== document.documentElement) {
    total += node.scrollTop;
    node = node.parentElement;
  }
  return total;
}

export function isStandaloneDisplay(
  matchMedia?: (query: string) => { matches: boolean },
  nav?: { standalone?: boolean },
): boolean {
  const media = matchMedia
    ?? (typeof window !== "undefined" ? window.matchMedia.bind(window) : undefined);
  if (media?.("(display-mode: standalone)").matches) return true;
  if (media?.("(display-mode: fullscreen)").matches) return true;
  const navigatorLike =
    nav ??
    (typeof navigator !== "undefined"
      ? (navigator as Navigator & { standalone?: boolean })
      : undefined);
  return Boolean(navigatorLike?.standalone);
}

/** Custom edge-swipe back is only for installed PWA; Safari already has one. */
export function shouldHandleEdgeBackSwipe(standalone: boolean): boolean {
  return standalone;
}
