"use client";

import type { ReactNode } from "react";

export type ChipOption<T extends string> = {
  value: T;
  label: ReactNode;
};

export function ChipGroup<T extends string>({
  name,
  value,
  options,
  onChange,
  label,
  className = "",
}: {
  name?: string;
  value: T;
  options: readonly ChipOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className}`.trim()} role="radiogroup" aria-label={label}>
      {label ? (
        <span className="text-xs font-medium text-ink-muted">{label}</span>
      ) : null}
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`notebook-btn inline-flex h-8 min-w-8 items-center justify-center px-2.5 text-xs font-medium ${
                selected
                  ? "bg-accent text-white"
                  : "border border-line bg-surface text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
