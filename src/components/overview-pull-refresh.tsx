"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAppUpdate } from "@/components/app-update-provider";
import { useT } from "@/components/i18n-provider";
import {
  PULL_THRESHOLD_PX,
  pullDistance,
  pulledOffset,
  shouldReleaseRefresh,
} from "@/lib/pull-refresh";

type Phase = "idle" | "pulling" | "checking" | "upToDate" | "updateAvailable";

export function OverviewPullRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useT();
  const { checkNow } = useAppUpdate();
  const [distance, setDistance] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const distanceRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const startYRef = useRef(0);
  const pullingRef = useRef(false);

  const setPhaseBoth = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const setDistanceBoth = (next: number) => {
    distanceRef.current = next;
    setDistance(next);
  };

  const runRefresh = useCallback(async () => {
    setPhaseBoth("checking");
    setDistanceBoth(PULL_THRESHOLD_PX);
    try {
      const available = await checkNow({ reveal: true });
      router.refresh();
      if (available) {
        setPhaseBoth("updateAvailable");
        await new Promise((resolve) => window.setTimeout(resolve, 400));
      } else {
        setPhaseBoth("upToDate");
        await new Promise((resolve) => window.setTimeout(resolve, 1400));
      }
    } finally {
      setPhaseBoth("idle");
      setDistanceBoth(0);
    }
  }, [checkNow, router]);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = "contain";

    const onStart = (event: TouchEvent) => {
      if (phaseRef.current === "checking") return;
      if (event.touches.length !== 1) return;
      const scrollTop = window.scrollY || root.scrollTop;
      if (scrollTop > 0) return;
      pullingRef.current = true;
      startYRef.current = event.touches[0]!.clientY;
    };

    const onMove = (event: TouchEvent) => {
      if (!pullingRef.current) return;
      if (phaseRef.current === "checking") return;
      const touch = event.touches[0];
      if (!touch) return;
      const scrollTop = window.scrollY || root.scrollTop;
      const next = pullDistance(startYRef.current, touch.clientY, scrollTop);
      if (next > 0) {
        if (event.cancelable) event.preventDefault();
        setPhaseBoth("pulling");
        setDistanceBoth(next);
      } else if (distanceRef.current > 0) {
        setDistanceBoth(0);
        setPhaseBoth("idle");
      }
    };

    const onEnd = () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      const dist = distanceRef.current;
      if (shouldReleaseRefresh(dist) && phaseRef.current !== "checking") {
        void runRefresh();
        return;
      }
      if (phaseRef.current === "checking") return;
      setDistanceBoth(0);
      setPhaseBoth("idle");
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      root.style.overscrollBehaviorY = previous;
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [runRefresh]);

  const busy = phase === "checking" || phase === "upToDate" || phase === "updateAvailable";
  const offset = busy ? PULL_THRESHOLD_PX : pulledOffset(distance);
  const visible = offset > 0 || busy;
  const label =
    phase === "checking"
      ? t("version.checking")
      : phase === "upToDate"
        ? t("version.upToDate")
        : phase === "updateAvailable"
          ? t("version.updateAvailable")
          : shouldReleaseRefresh(distance)
            ? t("version.checkNow")
            : null;

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 z-30 flex justify-center overflow-hidden"
        style={{
          top: "env(safe-area-inset-top, 0px)",
          height: visible ? offset : 0,
          opacity: visible ? 1 : 0,
        }}
        aria-live="polite"
        role="status"
      >
        <div className="flex items-end justify-center pb-1">
          <div className="flex items-center gap-2 rounded-full bg-surface/95 px-3 py-1 text-[12px] text-ink shadow-sm">
            <span
              aria-hidden
              className={`h-4 w-4 rounded-full border-2 border-ink/15 border-t-accent ${
                phase === "checking" || phase === "upToDate" || phase === "updateAvailable"
                  ? "animate-spin motion-reduce:animate-none"
                  : ""
              }`}
              style={
                phase === "pulling"
                  ? { transform: `rotate(${Math.min(distance / PULL_THRESHOLD_PX, 1) * 360}deg)` }
                  : undefined
              }
            />
            {label ? <span className="max-w-[14rem] truncate">{label}</span> : null}
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
