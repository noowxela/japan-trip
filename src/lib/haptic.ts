export const HAPTICS_STORAGE_KEY = "japan-trip-haptics";
export const HAPTICS_CHANGED_EVENT = "japan-trip-haptics-changed";

const TAP_MS = 15;
const TAP_SLOP_PX = 10;

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

export function hapticTap(): void {
  if (!hapticsEnabled()) return;

  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(TAP_MS);
      return;
    }
    iosTick();
  } catch {
    // Vibration is a progressive enhancement.
  }
}

export function isHapticControl(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;

  const control = target.closest(
    "button, a[href], [role='button'], summary, select, .notebook-press, .notebook-btn, input[type='button'], input[type='submit'], input[type='reset'], input[type='checkbox'], input[type='radio']",
  );
  if (!control) return null;
  if (control.closest("[data-no-haptic]")) return null;
  if (control.getAttribute("aria-disabled") === "true") return null;
  if (control instanceof HTMLButtonElement && control.disabled) return null;
  if (control instanceof HTMLInputElement && control.disabled) return null;
  if (control instanceof HTMLSelectElement && control.disabled) return null;
  if (control instanceof HTMLAnchorElement && control.getAttribute("aria-disabled") === "true") {
    return null;
  }

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
