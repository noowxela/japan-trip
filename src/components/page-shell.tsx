import type { ReactNode } from "react";

export const pageShellClass =
  "mx-auto flex w-full min-w-0 max-w-xl flex-col gap-3 px-4 py-4 pb-[calc(var(--tab-bar-height,4.25rem)+1.25rem)] pt-[max(1rem,env(safe-area-inset-top))] md:max-w-5xl md:px-8";

export const cardGridClass = "grid gap-3 sm:grid-cols-2";

export const formShellClass = "w-full max-w-xl";

export const cardClass = "notebook-card p-3 md:p-4";

export const cardHeroClass = "notebook-card p-4";

export const linkCardClass =
  "notebook-card notebook-press flex min-h-11 min-w-0 items-center justify-between gap-3 px-4 py-3";

export const settingsGroupClass =
  "overflow-hidden rounded-2xl bg-surface shadow-[var(--card-shadow)]";

export const settingsRowClass =
  "flex min-h-11 w-full min-w-0 items-center justify-between gap-3 px-4 py-2.5";

export const btnPrimaryClass =
  "notebook-btn inline-flex h-9 items-center justify-center bg-accent px-3 text-[13px] font-medium text-white disabled:opacity-60";

export const btnGhostClass =
  "notebook-btn inline-flex h-9 items-center justify-center px-3 text-[13px] font-medium text-ink-muted";

export const fieldClass =
  "h-9 w-full min-w-0 rounded-lg border border-line bg-surface px-2.5 text-[14px] text-ink outline-none focus:border-accent";

export const eyebrowClass = "text-[11px] font-medium leading-4 text-ink-muted";

export const sectionLabelClass =
  "px-1 text-[12px] font-medium leading-4 text-ink-muted";

export const linkQuietClass = "font-medium text-ink-muted no-underline";

export function PageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={`${pageShellClass} ${className}`.trim()}>{children}</main>;
}
