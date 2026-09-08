"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const alert = variant === "alert";
  const contentRef = useRef({ title, children });
  if (open) contentRef.current = { title, children };
  const shownTitle = contentRef.current.title;
  const shownChildren = contentRef.current.children;

  const finishClose = useCallback(() => {
    setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setMounted(true);
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setShown(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setShown(false);
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

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center transition-opacity duration-300 ease-out motion-reduce:transition-none ${
        alert ? "items-center p-6" : "items-end"
      } ${shown ? "opacity-100" : "opacity-0"}`}
      role="presentation"
    >
      <div
        aria-hidden
        className={`absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none ${
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
            ? "relative z-10 w-full max-w-[270px] overflow-hidden rounded-[14px] bg-white/90 shadow-[0_12px_40px_rgba(28,25,23,0.22)] backdrop-blur-xl"
            : `relative z-10 flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-b-0 border-sage bg-paper transition-transform duration-300 ease-out motion-reduce:transition-none ${
                shown ? "translate-y-0" : "translate-y-full"
              }`
        }
      >
        {alert ? (
          <>
            <h2
              id="modal-title"
              className="px-4 pt-4 pb-3 text-center text-[17px] font-semibold leading-snug text-stone-900"
            >
              {shownTitle}
            </h2>
            <div className="flex flex-col">{shownChildren}</div>
          </>
        ) : (
          <>
            <div className="flex shrink-0 flex-col border-b border-sage/80 px-4 pb-3 pt-2">
              <div
                aria-hidden
                className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-sage"
              />
              <div className="flex items-center justify-between gap-3">
                <h2 id="modal-title" className="font-medium text-stone-900">
                  {shownTitle}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="notebook-btn px-2 py-1 text-sm text-stone-500 hover:bg-sage/70 hover:text-stone-800"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto p-4">{shownChildren}</div>
          </>
        )}
      </div>
    </div>
  );
}
