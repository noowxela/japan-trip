"use client";

import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "className"> & {
  value: string;
  /** Shown when the field has a non-empty value. */
  clearLabel: string;
  onClear: () => void;
  className?: string;
  /** Extra classes on the outer relative wrapper (e.g. flex-1). */
  wrapperClassName?: string;
};

/** Controlled text/url input with a trailing × to wipe the value. */
export function ClearableInput({
  value,
  clearLabel,
  onClear,
  className = "",
  wrapperClassName = "",
  ...inputProps
}: Props) {
  const hasValue = value.length > 0;

  return (
    <div className={`relative min-w-0 ${wrapperClassName}`.trim()}>
      <input
        {...inputProps}
        value={value}
        className={`${className} ${hasValue ? "pr-9" : ""}`.trim()}
      />
      {hasValue ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink"
        >
          <span aria-hidden className="text-lg leading-none">
            ×
          </span>
        </button>
      ) : null}
    </div>
  );
}
