import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="notebook-card border-dashed bg-white/70 px-4 py-8 text-center shadow-none">
      <p className="font-medium text-stone-800">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{children}</p>
    </div>
  );
}
