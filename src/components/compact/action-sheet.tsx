"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/modal";
import {
  compactBtnDangerClass,
  compactSheetActionClass,
} from "@/components/compact/classes";

export function ActionSheet({
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
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="grid gap-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)]">
        {children}
      </div>
    </Modal>
  );
}

export function ActionSheetItem({
  children,
  onClick,
  disabled,
  danger = false,
  className = "",
  "data-haptic": dataHaptic,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
  "data-haptic"?: "manual";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-haptic={dataHaptic}
      className={`${danger ? compactBtnDangerClass : compactSheetActionClass} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

export function RowMoreButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <circle cx="6" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="18" cy="12" r="1.5" fill="currentColor" />
      </svg>
    </button>
  );
}
