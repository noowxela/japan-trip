"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type ChipRowOption<T extends string> = {
  value: T;
  label: ReactNode;
  color?: string;
};

export function ChipRow<T extends string>({
  value,
  options,
  onChange,
  label,
  className = "",
}: {
  value: T;
  options: readonly ChipRowOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`chip-scroll-fade ${className}`.trim()}>
      <div
        role="toolbar"
        aria-label={label}
        className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5"
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-medium ${
                active
                  ? "bg-ink text-surface"
                  : "border border-line bg-surface text-ink"
              }`}
            >
              {option.color ? (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: option.color }}
                  aria-hidden
                />
              ) : null}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Nav-style chip row using links (lists sub-nav). */
export function ChipLinkRow({
  items,
  current,
  className = "",
}: {
  items: readonly { href: string; label: ReactNode }[];
  current: string;
  className?: string;
}) {
  return (
    <nav className={`chip-scroll-fade ${className}`.trim()} aria-label="Lists">
      <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {items.map((item) => {
          const active = current === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-xs font-medium no-underline ${
                active
                  ? "bg-ink text-surface"
                  : "border border-line bg-surface text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
