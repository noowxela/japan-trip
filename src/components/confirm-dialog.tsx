"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "@/components/i18n-provider";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="notebook-card w-[min(100%,24rem)] p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="grid gap-4 p-5">
        <div>
          <p className="text-xl font-semibold">{title}</p>
          <div className="mt-2 text-sm text-ink-muted">{message}</div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="notebook-btn px-4 py-2 text-sm font-medium text-ink-muted disabled:opacity-60"
          >
            {cancelLabel ?? t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`notebook-btn px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
              tone === "danger" ? "bg-accent" : "bg-ink"
            }`}
          >
            {busy ? t("common.working") : (confirmLabel ?? t("confirm.confirm"))}
          </button>
        </div>
      </div>
    </dialog>
  );
}
