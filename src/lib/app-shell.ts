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

type OverflowStyles = {
  el: HTMLElement;
  overflow: string;
  overflowX: string;
  overflowY: string;
};

function collectScrollLockTargets(from?: Element | null): HTMLElement[] {
  const nodes: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  function add(node: HTMLElement | null | undefined) {
    if (!node || seen.has(node)) return;
    seen.add(node);
    nodes.push(node);
  }

  add(getAppScrollElement());
  if (typeof document !== "undefined") {
    add(document.body);
    add(document.documentElement);
  }

  let node: HTMLElement | null =
    from instanceof HTMLElement ? from : (from?.parentElement ?? null);
  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    if (
      style.overflowY === "auto" ||
      style.overflowY === "scroll" ||
      style.overflowX === "auto" ||
      style.overflowX === "scroll"
    ) {
      add(node);
    }
    node = node.parentElement;
  }
  return nodes;
}

/**
 * Freeze #app-scroll, the document, and scrollable ancestors so a portaled
 * overlay (date picker, context menu, slide-in) does not lose taps to iOS
 * background scrolling after the native app-shell change.
 */
export function lockAppScroll(
  from?: Element | null,
  options?: { preventTouchMove?: boolean },
): () => void {
  if (typeof document === "undefined") return () => {};

  const previous: OverflowStyles[] = collectScrollLockTargets(from).map((el) => {
    const stored = {
      el,
      overflow: el.style.overflow,
      overflowX: el.style.overflowX,
      overflowY: el.style.overflowY,
    };
    el.style.overflow = "hidden";
    el.style.overflowX = "hidden";
    el.style.overflowY = "hidden";
    return stored;
  });

  const onTouchMove = (event: TouchEvent) => {
    event.preventDefault();
  };
  // Opt-in: a document-level preventDefault would also block scrolling
  // inside a slide-in form. Only overlays (date picker, context menu) want it.
  if (options?.preventTouchMove) {
    document.addEventListener("touchmove", onTouchMove, { passive: false });
  }

  return () => {
    if (options?.preventTouchMove) {
      document.removeEventListener("touchmove", onTouchMove);
    }
    for (const item of previous) {
      item.el.style.overflow = item.overflow;
      item.el.style.overflowX = item.overflowX;
      item.el.style.overflowY = item.overflowY;
    }
  };
}
