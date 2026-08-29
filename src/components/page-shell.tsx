import type { ReactNode } from "react";

export const pageShellClass =
  "mx-auto flex w-full min-w-0 max-w-xl flex-col gap-6 px-4 py-6 md:max-w-5xl md:px-8";

export const navInnerClass =
  "mx-auto flex w-full min-w-0 max-w-xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-3 sm:px-4 md:max-w-5xl md:px-8";

export const cardGridClass = "grid gap-3 sm:grid-cols-2";

export const formShellClass = "w-full max-w-xl";

export function PageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={`${pageShellClass} ${className}`.trim()}>{children}</main>;
}
