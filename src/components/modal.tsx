"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useT } from "@/components/i18n-provider";

const DRAWER_MS = 320;

export function Modal({
  open,
  onClose,
  title,
  children,
  variant = "sheet",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  variant?: "sheet" | "alert";
}) {
  const { t } = useT();
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const [cachedTitle, setCachedTitle] = useState(title);
  const [cachedChildren, setCachedChildren] = useState(children);
  const closeTimerRef = useRef<number | null>(null);
  const alert = variant === "alert";

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCachedTitle(title);
      setCachedChildren(children);
    } else {
      setShown(false);
    }
  } else if (open) {
    if (title !== cachedTitle) setCachedTitle(title);
    if (children !== cachedChildren) setCachedChildren(children);
  }

  const shownTitle = open ? title : cachedTitle;
  const shownChildren = open ? children : cachedChildren;

  const finishClose = useCallback(() => {
    setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      const frame = window.requestAnimationFrame(() => {
        setMounted(true);
        window.requestAnimationFrame(() => setShown(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    closeTimerRef.current = window.setTimeout(finishClose, DRAWER_MS);
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, finishClose]);

  useEffect(() => {
    if (!mounted) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [mounted, onClose]);

  if (!open && !mounted) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex justify-center transition-opacity duration-300 ease-out motion-reduce:transition-none ${
        alert ? "items-center p-6" : "items-end"
      } ${shown ? "opacity-100" : "opacity-0"}`}
      role="presentation"
    >
      <div
        aria-hidden
        className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none ${
          shown ? "opacity-100" : "opacity-0"
        }`}
        onPointerDown={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onPointerDown={(event) => event.stopPropagation()}
        onTransitionEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            (event.propertyName === "transform" || event.propertyName === "opacity") &&
            !shown &&
            !open
          ) {
            finishClose();
          }
        }}
        className={
          alert
            ? "relative z-10 w-full max-w-[270px] overflow-hidden rounded-[14px] bg-surface/90 shadow-[0_12px_40px_rgba(28,25,23,0.22)] backdrop-blur-xl"
            : `relative z-10 flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-b-0 border-line bg-canvas transition-transform duration-300 ease-out motion-reduce:transition-none ${
                shown ? "translate-y-0" : "translate-y-full"
              }`
        }
      >
        {alert ? (
          <>
            <h2
              id="modal-title"
              className="px-4 pt-4 pb-3 text-center text-[17px] font-semibold leading-snug text-ink"
            >
              {shownTitle}
            </h2>
            <div className="flex flex-col">{shownChildren}</div>
          </>
        ) : (
          <>
            <div className="flex shrink-0 flex-col border-b border-line px-4 pb-3 pt-2">
              <div
                aria-hidden
                className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-line"
              />
              <div className="flex items-center justify-between gap-3">
                <h2 id="modal-title" className="font-medium text-ink">
                  {shownTitle}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("common.close")}
                  className="notebook-btn px-2 py-1 text-sm text-ink-muted hover:bg-canvas hover:text-ink"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto p-4">{shownChildren}</div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
