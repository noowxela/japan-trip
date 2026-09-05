"use client";

import { useEffect, useState } from "react";
import { cardClass } from "@/components/page-shell";
import {
  HAPTICS_CHANGED_EVENT,
  hapticTap,
  hapticsEnabled,
  setHapticsEnabled,
} from "@/lib/haptic";

export function HapticToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sync = () => setEnabled(hapticsEnabled());
    sync();
    window.addEventListener(HAPTICS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(HAPTICS_CHANGED_EVENT, sync);
  }, []);

  return (
    <div className={`${cardClass} flex items-center justify-between gap-3`}>
      <div>
        <p className="text-sm font-medium text-stone-800">Haptic taps</p>
        <p className="mt-1 text-sm text-stone-500">
          Light vibration when you tap buttons and links on this phone.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Haptic taps"
        onClick={() => {
          const next = !enabled;
          setHapticsEnabled(next);
          if (next) hapticTap();
        }}
        className={`notebook-btn relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-hanko" : "bg-stone-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
