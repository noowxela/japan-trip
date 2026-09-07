"use client";

import { useEffect } from "react";
import {
  attachIosHapticOverlays,
  captureGestureOrigin,
  gestureWasScroll,
  hapticTap,
  isHapticControl,
  shouldUseIosOverlays,
  type GestureOrigin,
} from "@/lib/haptic";

type PendingTap = {
  pointerId: number;
  origin: GestureOrigin;
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
        origin: captureGestureOrigin(event.clientX, event.clientY, event.target as Element),
      };
    };

    const onPointerUp = (event: PointerEvent) => {
      const start = pending;
      pending = null;
      if (!start || start.pointerId !== event.pointerId) return;
      if (
        gestureWasScroll(
          start.origin,
          event.clientX,
          event.clientY,
          event.target instanceof Element ? event.target : null,
        )
      ) {
        return;
      }
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
