import type { ReactNode } from "react";

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 px-4 py-8 text-center">
      <p className="font-medium text-stone-800">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{children}</p>
    </div>
  );
}
