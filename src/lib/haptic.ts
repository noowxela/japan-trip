export const HAPTICS_STORAGE_KEY = "japan-trip-haptics";
export const HAPTICS_CHANGED_EVENT = "japan-trip-haptics-changed";

const TAP_MS = 15;
const TAP_SLOP_PX = 10;
const SUCCESS_PATTERN = [12, 40, 28];
const ERROR_PATTERN = [40, 50, 40];
const OVERLAY_ATTR = "data-haptic-overlay";
const HAPTIC_SELECTOR =
  "button, a[href], [role='button'], .notebook-press, .notebook-btn, input[type='button'], input[type='submit'], input[type='reset']";

let iosSwitch: HTMLInputElement | null = null;

export function hapticsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(HAPTICS_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  localStorage.setItem(HAPTICS_STORAGE_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new Event(HAPTICS_CHANGED_EVENT));
}

export function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function shouldUseIosOverlays(): boolean {
  return (
    isAppleTouchDevice() &&
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate !== "function"
  );
}

export function hapticTap(): void {
  vibrateOrTick(TAP_MS);
}

export function hapticSuccess(): void {
  vibrateOrTick(SUCCESS_PATTERN);
}

export function hapticError(): void {
  vibrateOrTick(ERROR_PATTERN);
}

export function isControlDisabled(el: Element): boolean {
  if (el.getAttribute("aria-disabled") === "true") return true;
  if (el instanceof HTMLButtonElement && el.disabled) return true;
  if (el instanceof HTMLInputElement && el.disabled) return true;
  if (el instanceof HTMLSelectElement && el.disabled) return true;
  const fieldset = el.closest("fieldset");
  return fieldset instanceof HTMLFieldSetElement && fieldset.disabled;
}

export function isHapticControl(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  if (target.closest(`[${OVERLAY_ATTR}]`)) {
    const host = target.closest(HAPTIC_SELECTOR);
    return host && !isSkipped(host) ? host : null;
  }

  const control = target.closest(HAPTIC_SELECTOR);
  if (!control || isSkipped(control) || isControlDisabled(control)) return null;
  return control;
}

export function movedBeyondTap(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): boolean {
  const dx = endX - startX;
  const dy = endY - startY;
  return dx * dx + dy * dy > TAP_SLOP_PX * TAP_SLOP_PX;
}

export function attachIosHapticOverlays(): () => void {
  const detachers = new Map<Element, () => void>();
  const overlays = new Set<HTMLInputElement>();

  const attachOne = (el: Element) => {
    if (!(el instanceof HTMLElement)) return;
    if (detachers.has(el)) return;
    if (isSkipped(el)) return;
    const detach = attachOverlay(el, overlays);
    if (detach) detachers.set(el, detach);
  };

  const detachOne = (el: Element) => {
    detachers.get(el)?.();
    detachers.delete(el);
  };

  document.querySelectorAll(HAPTIC_SELECTOR).forEach(attachOne);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches(HAPTIC_SELECTOR)) attachOne(node);
        node.querySelectorAll(HAPTIC_SELECTOR).forEach(attachOne);
      }
      for (const node of mutation.removedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (detachers.has(node)) detachOne(node);
        node.querySelectorAll(HAPTIC_SELECTOR).forEach(detachOne);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  const syncEnabled = () => {
    const enabled = hapticsEnabled();
    for (const overlay of overlays) {
      overlay.style.pointerEvents = enabled ? "auto" : "none";
    }
  };
  window.addEventListener(HAPTICS_CHANGED_EVENT, syncEnabled);

  return () => {
    observer.disconnect();
    window.removeEventListener(HAPTICS_CHANGED_EVENT, syncEnabled);
    for (const detach of detachers.values()) detach();
    detachers.clear();
    overlays.clear();
  };
}

function isSkipped(el: Element): boolean {
  return (
    el.hasAttribute(OVERLAY_ATTR) ||
    Boolean(el.closest("[data-no-haptic]")) ||
    el.getAttribute("aria-disabled") === "true"
  );
}

function attachOverlay(
  host: HTMLElement,
  overlays: Set<HTMLInputElement>,
): (() => void) | undefined {
  if (host.querySelector(`[${OVERLAY_ATTR}]`)) return;

  const position = getComputedStyle(host).position;
  if (
    position !== "absolute" &&
    position !== "relative" &&
    position !== "fixed" &&
    position !== "sticky"
  ) {
    host.style.position = "relative";
  }

  const overlay = document.createElement("input");
  overlay.type = "checkbox";
  overlay.setAttribute("switch", "");
  overlay.setAttribute(OVERLAY_ATTR, "");
  overlay.setAttribute("aria-hidden", "true");
  overlay.tabIndex = -1;
  overlay.style.cssText = [
    "position:absolute",
    "inset:0",
    "width:100%",
    "height:100%",
    "margin:0",
    "padding:0",
    "border:0",
    "z-index:1",
    "opacity:0",
    "cursor:inherit",
    "-webkit-appearance:switch",
    "appearance:auto",
    "touch-action:manipulation",
    `pointer-events:${hapticsEnabled() ? "auto" : "none"}`,
  ].join(";");

  const onClick = (event: Event) => {
    event.stopPropagation();
    if (!hapticsEnabled() || isControlDisabled(host)) return;
    host.click();
  };

  overlay.addEventListener("click", onClick);
  host.appendChild(overlay);
  overlays.add(overlay);

  return () => {
    overlay.removeEventListener("click", onClick);
    overlays.delete(overlay);
    overlay.remove();
  };
}

function vibrateOrTick(pattern: number | number[]): void {
  if (!hapticsEnabled()) return;

  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
      return;
    }
    iosTick();
    if (Array.isArray(pattern) && pattern.length > 1) {
      window.setTimeout(iosTick, 70);
    }
  } catch {
    // Vibration is a progressive enhancement.
  }
}

function iosTick(): void {
  const input = getIosSwitch();
  if (!input) return;
  input.click();
}

function getIosSwitch(): HTMLInputElement | null {
  if (typeof document === "undefined") return null;
  if (iosSwitch?.isConnected) return iosSwitch;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.setAttribute("aria-hidden", "true");
  input.tabIndex = -1;
  input.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;margin:0;padding:0;opacity:0;pointer-events:none;border:0;";
  document.body.appendChild(input);
  iosSwitch = input;
  return input;
}
