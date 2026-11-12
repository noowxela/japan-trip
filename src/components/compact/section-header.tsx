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
      className={`flex min-h-7 items-start justify-between gap-2 ${
        sticky
          ? "sticky top-0 z-10 bg-canvas/95 backdrop-blur-sm"
          : ""
      } ${className}`.trim()}
    >
      <p className="min-w-0 break-words [overflow-wrap:anywhere] text-[12px] font-medium leading-4 text-ink-muted">
        {title}
      </p>
      {right ? (
        <p className="shrink-0 whitespace-nowrap text-[12px] tabular-nums text-ink-muted">
          {right}
        </p>
      ) : null}
    </div>
  );
}
