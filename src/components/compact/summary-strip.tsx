import type { ReactNode } from "react";

export function SummaryStrip({
  children,
  footer,
  className = "",
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`max-h-[90px] rounded-xl border border-line bg-surface px-3 py-2 ${className}`.trim()}
    >
      <div className="truncate text-[13px] leading-5 text-ink">{children}</div>
      {footer ? <div className="mt-1 text-[11px] text-ink-muted">{footer}</div> : null}
    </section>
  );
}
