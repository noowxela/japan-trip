import type { ReactNode } from "react";

export function SectionHeader({
  title,
  right,
  sticky = false,
  className = "",
}: {
  title: ReactNode;
  right?: ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex h-7 items-center justify-between gap-2 ${
        sticky
          ? "sticky top-0 z-10 bg-canvas/95 backdrop-blur-sm"
          : ""
      } ${className}`.trim()}
    >
      <p className="min-w-0 truncate text-[12px] font-medium text-ink-muted">
        {title}
      </p>
      {right ? (
        <p className="shrink-0 text-[12px] tabular-nums text-ink-muted">
          {right}
        </p>
      ) : null}
    </div>
  );
}
