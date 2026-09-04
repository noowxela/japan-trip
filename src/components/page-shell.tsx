import type { ReactNode } from "react";

export const pageShellClass =
  "mx-auto flex w-full min-w-0 max-w-xl flex-col gap-6 px-4 py-6 pb-24 md:max-w-5xl md:px-8 md:pb-6";

export const navInnerClass =
  "mx-auto flex w-full min-w-0 max-w-xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-3 sm:px-4 md:max-w-5xl md:px-8";

export const cardGridClass = "grid gap-3 sm:grid-cols-2";

export const formShellClass = "w-full max-w-xl";

export const cardClass = "notebook-card p-4";

export const linkCardClass =
  "notebook-card notebook-press flex min-w-0 items-center justify-between gap-3 px-4 py-3";

export const btnPrimaryClass =
  "notebook-btn bg-hanko px-4 py-2 text-sm font-medium text-white disabled:opacity-60";

export const btnGhostClass =
  "notebook-btn px-4 py-2 text-sm font-medium text-stone-600";

export const fieldClass =
  "rounded-xl border border-sage bg-white px-3 py-2 text-sm outline-none focus:border-moss";

export const eyebrowClass =
  "text-xs uppercase tracking-[0.2em] text-moss";

export function PageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={`${pageShellClass} ${className}`.trim()}>{children}</main>;
}
