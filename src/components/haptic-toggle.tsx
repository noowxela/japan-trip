"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n-provider";
import { cardClass } from "@/components/page-shell";
import {
  HAPTICS_CHANGED_EVENT,
  hapticTap,
  hapticsEnabled,
  setHapticsEnabled,
} from "@/lib/haptic";

export function HapticToggle() {
  const { t } = useT();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sync = () => setEnabled(hapticsEnabled());
    sync();
    window.addEventListener(HAPTICS_CHANGED_EVENT, sync);
    return () => window.removeEventListener(HAPTICS_CHANGED_EVENT, sync);
  }, []);

  return (
    <div
      className={`${cardClass} flex min-h-11 items-center justify-between gap-3 !rounded-xl !p-3`}
    >
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-ink">{t("haptic.label")}</p>
        <p className="mt-0.5 text-[12px] text-ink-muted">{t("haptic.detail")}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={t("haptic.label")}
        onClick={() => {
          const next = !enabled;
          setHapticsEnabled(next);
          if (next) hapticTap();
        }}
        className={`notebook-btn relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          enabled ? "bg-accent" : "bg-ink-muted/35"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-surface shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
