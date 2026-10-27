"use client";

import { useT } from "@/components/i18n-provider";
import { PageShell } from "@/components/page-shell";

export function TimelineSkeleton({ rows = 6 }: { rows?: number }) {
  const { t } = useT();
  return (
    <div
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-label={t("a11y.loadingTimeline")}
    >
      <div className="space-y-2">
        <div className="h-3 w-20 animate-pulse rounded bg-line motion-reduce:animate-none" />
        <div className="h-7 w-48 animate-pulse rounded bg-line motion-reduce:animate-none" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[2.75rem_1.5rem_minmax(0,1fr)] items-start gap-x-2"
        >
          <div className="mt-1 h-3 w-10 animate-pulse rounded bg-line motion-reduce:animate-none" />
          <div className="mx-auto mt-1.5 h-3 w-3 animate-pulse rounded-full bg-line motion-reduce:animate-none" />
          <div className="space-y-2 rounded-xl bg-surface p-3 shadow-[var(--card-shadow)]">
            <div className="h-4 w-[75%] max-w-[16rem] animate-pulse rounded bg-line motion-reduce:animate-none" />
            <div className="h-3 w-[50%] max-w-[10rem] animate-pulse rounded bg-line motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TimelineSkeletonPage({ rows = 6 }: { rows?: number }) {
  return (
    <PageShell>
      <TimelineSkeleton rows={rows} />
    </PageShell>
  );
}
