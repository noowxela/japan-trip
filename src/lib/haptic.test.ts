import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  HAPTIC_PATTERNS,
  HAPTICS_STORAGE_KEY,
  haptic,
  hapticError,
  hapticSuccess,
  hapticTap,
  hapticsEnabled,
  setHapticsEnabled,
} from "@/lib/haptic";

describe("haptic patterns", () => {
  it("maps kinds to patterns", () => {
    expect(HAPTIC_PATTERNS.tap).toBe(15);
    expect(HAPTIC_PATTERNS.success).toEqual([12, 40, 28]);
    expect(HAPTIC_PATTERNS.warning).toEqual([25, 40, 25]);
    expect(HAPTIC_PATTERNS.error).toEqual([40, 50, 40]);
    expect(HAPTIC_PATTERNS.undo).toEqual([18, 30, 18]);
  });
});

describe("hapticsEnabled / setHapticsEnabled", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    });
    vi.stubGlobal("localStorage", window.localStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to on", () => {
    expect(hapticsEnabled()).toBe(true);
  });

  it("persists off and blocks haptic()", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });
    setHapticsEnabled(false);
    expect(localStorage.getItem(HAPTICS_STORAGE_KEY)).toBe("off");
    expect(hapticsEnabled()).toBe(false);
    haptic("success");
    hapticTap();
    hapticSuccess();
    hapticError();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("vibrates when enabled", () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal("navigator", { vibrate });
    setHapticsEnabled(true);
    haptic("tap");
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.tap);
    haptic("undo");
    expect(vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.undo);
  });
});
