"use client";

import { useEffect } from "react";
import {
  attachIosHapticOverlays,
  hapticTap,
  isHapticControl,
  movedBeyondTap,
  shouldUseIosOverlays,
} from "@/lib/haptic";

type PendingTap = {
  pointerId: number;
  x: number;
  y: number;
};

export function HapticProvider() {
  useEffect(() => {
    if (shouldUseIosOverlays()) {
      return attachIosHapticOverlays();
    }

    let pending: PendingTap | null = null;

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      if (event.pointerType === "mouse") {
        pending = null;
        return;
      }
      if (!isHapticControl(event.target)) {
        pending = null;
        return;
      }
      pending = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      };
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = pending;
      pending = null;
      if (!start || start.pointerId !== event.pointerId) return;
      if (movedBeyondTap(start.x, start.y, event.clientX, event.clientY)) return;
      if (!isHapticControl(event.target)) return;
      hapticTap();
    };

    const onPointerCancel = () => {
      pending = null;
    };

    document.addEventListener("pointerdown", onPointerDown, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointerup", onPointerUp, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointercancel", onPointerCancel, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerCancel, true);
    };
  }, []);

  return null;
}
