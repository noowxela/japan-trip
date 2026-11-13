"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import {
  isStandaloneDisplay,
  lockAppScroll,
  shouldHandleEdgeBackSwipe,
} from "@/lib/app-shell";

const SLIDE_MS = 380;
const EDGE_PX = 28;
const DISMISS_PX = 88;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

const subscribeClient = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

const SlideInContext = createContext<{ close: () => void } | null>(null);

export function useSlideIn() {
  return useContext(SlideInContext);
}

export function SlideInPage({
  children,
  backHref = "/budget",
  backLabel,
  onClose,
}: {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { t } = useT();
  const label = backLabel ?? t("common.back");
  const [shown, setShown] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [grabbing, setGrabbing] = useState(false);
  const [settled, setSettled] = useState(false);
  const portalReady = useSyncExternalStore(
    subscribeClient,
    clientSnapshot,
    serverSnapshot,
  );
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const closingRef = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setShown(true));
    });
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const settleTimer = window.setTimeout(
      () => setSettled(true),
      reduceMotion ? 0 : SLIDE_MS,
    );
    const unlock = lockAppScroll();
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      unlock();
    };
  }, []);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    startXRef.current = null;
    setGrabbing(false);
    setDragX(0);
    setSettled(false);
    setShown(false);
    const delay =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : SLIDE_MS;
    window.setTimeout(() => {
      if (onClose) {
        onClose();
        return;
      }
      if (window.history.length > 1) router.back();
      else router.push(backHref);
      router.refresh();
    }, delay);
  }, [backHref, onClose, router]);

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!shouldHandleEdgeBackSwipe(isStandaloneDisplay())) return;
    if (closingRef.current || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (touch.clientX > EDGE_PX) return;
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    setGrabbing(true);
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (startXRef.current == null) return;
    const touch = event.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = Math.abs(touch.clientY - startYRef.current);
    if (dy > 12 && dy > dx) {
      startXRef.current = null;
      setGrabbing(false);
      setDragX(0);
      return;
    }
    setDragX(Math.max(0, dx));
  }

  function onTouchEnd() {
    if (startXRef.current == null) {
      setGrabbing(false);
      return;
    }
    const shouldClose = dragX > DISMISS_PX;
    startXRef.current = null;
    setGrabbing(false);
    if (shouldClose) {
      close();
      return;
    }
    window.requestAnimationFrame(() => setDragX(0));
  }

  const moving = grabbing || dragX !== 0;
  const node = (
    <SlideInContext.Provider value={{ close }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="fixed inset-0 z-40 overflow-x-clip overflow-y-auto overscroll-none bg-canvas motion-reduce:transition-none"
        style={{
          transform: !shown
            ? "translate3d(100%,0,0)"
            : moving
              ? `translate3d(${dragX}px,0,0)`
              : settled
                ? "none"
                : "translate3d(0,0,0)",
          willChange: settled && !moving ? "auto" : "transform",
          transition: grabbing
            ? "none"
            : `transform ${SLIDE_MS}ms ${EASE}`,
          boxShadow: "-16px 0 40px rgba(28,25,23,0.16)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div className="sticky top-0 z-10 border-b border-line bg-canvas/95 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
          <button
            type="button"
            onClick={close}
            className="flex min-h-11 items-center gap-0.5 px-2 text-[17px] font-medium text-ink-muted no-underline"
          >
            <BackChevron />
            {label}
          </button>
        </div>
        {children}
      </div>
    </SlideInContext.Provider>
  );

  if (typeof document === "undefined" || !portalReady) return null;
  return createPortal(node, document.body);
}

function BackChevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}
