import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="notebook-card border-dashed bg-surface/70 px-4 py-8 text-center shadow-none">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-muted">{children}</p>
    </div>
  );
}
