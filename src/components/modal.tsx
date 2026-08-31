"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-10 flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-stone-200 bg-[#f6f1e8] shadow-xl sm:mx-4 sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200/80 px-4 py-3">
          <h2 id="modal-title" className="font-medium text-stone-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full px-2 py-1 text-sm text-stone-500 hover:bg-stone-200/60 hover:text-stone-800"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
