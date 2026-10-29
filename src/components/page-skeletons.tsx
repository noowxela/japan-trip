"use client";

import {
  SkeletonBar,
  SkeletonChips,
  SkeletonHeader,
  SkeletonLine,
  SkeletonPage,
  SkeletonRows,
  SkeletonSectionHeader,
  SkeletonSegmented,
  SkeletonStatus,
  SkeletonStrip,
} from "@/components/compact";
import { useT } from "@/components/i18n-provider";

/** Route loading UIs. Each mirrors its page's compact structure top-down. */

export function OverviewSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-10" action="pair" />
      <SkeletonStrip />
      <div className="grid gap-2" aria-hidden>
        <div className="flex min-h-12 items-center gap-1 rounded-xl border border-line border-l-[3px] border-l-accent/40 bg-surface py-1 pl-3 pr-1">
          <div className="min-w-0 flex-1">
            <SkeletonLine box="h-5" bar="h-3.5" width="w-3/5" />
            <SkeletonLine box="mt-0.5 h-[18px]" bar="h-2.5" width="w-2/5" />
          </div>
          <span className="h-10 w-20 shrink-0" />
        </div>
        <SkeletonRows rows={1} />
        <SkeletonRows rows={1} />
      </div>
      <div aria-hidden>
        <SkeletonSectionHeader right />
        <SkeletonRows rows={2} leading="time" />
      </div>
    </SkeletonPage>
  );
}

/** Lists hub + Places / Stays / Transit share header + sub-nav chips. */
export function ListsSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonChips count={4} />
      <SkeletonRows rows={3} trailing="chevron" />
    </SkeletonPage>
  );
}

export function PlacesSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader action="button" />
      <SkeletonChips count={4} />
      <div className="space-y-2.5" aria-hidden>
        <div className="h-9 rounded-lg border border-line bg-surface" />
        <SkeletonChips count={4} />
        <SkeletonChips count={6} />
        <SkeletonRows rows={10} trailing="more" />
      </div>
    </SkeletonPage>
  );
}

export function StaysSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader action="button" />
      <SkeletonChips count={4} />
      <SkeletonRows rows={3} leading="date" trailing="more" />
    </SkeletonPage>
  );
}

export function TransitSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader action="button" />
      <SkeletonChips count={4} />
      <SkeletonRows rows={6} leading="time" trailing="more" />
    </SkeletonPage>
  );
}

export function DaysSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonLine box="h-5" bar="h-3" width="w-24" />
      <SkeletonHeader action="button" />
      <SkeletonRows rows={8} trailing="pair" />
    </SkeletonPage>
  );
}

export function PrepSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-20" />
      <SkeletonLine box="-mt-1 h-[18px]" bar="h-2.5" width="w-48" />
      <div className="space-y-2.5" aria-hidden>
        <SkeletonStrip progress />
        <SkeletonRows rows={5} leading="check" secondary={false} trailing="more" />
        <div className="h-[50px] rounded-xl border border-line bg-surface" />
      </div>
    </SkeletonPage>
  );
}

export function SettingsSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <section className="space-y-1.5" aria-hidden>
        <SkeletonSectionHeader />
        <SkeletonSegmented count={2} />
      </section>
      <section className="space-y-1.5" aria-hidden>
        <SkeletonSectionHeader />
        <SkeletonSegmented count={3} />
      </section>
      <section className="space-y-1.5" aria-hidden>
        <SkeletonSectionHeader />
        <SkeletonRows rows={6} trailing="chevron" />
      </section>
      <section className="space-y-1.5" aria-hidden>
        <SkeletonSectionHeader />
        <SkeletonRows rows={1} />
      </section>
    </SkeletonPage>
  );
}

export function PhrasesSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader titleWidth="w-20" action="button" />
      <SkeletonLine box="-mt-1 h-[18px]" bar="h-2.5" width="w-64" />
      <SkeletonChips count={7} />
      <section className="space-y-1.5" aria-hidden>
        <SkeletonSectionHeader />
        <SkeletonLine box="h-[18px] px-1" bar="h-2.5" width="w-52" />
        <SkeletonRows rows={3} trailing="chevron" />
      </section>
      <section className="space-y-1.5" aria-hidden>
        <SkeletonSectionHeader right />
        <SkeletonLine box="h-5 px-1" bar="h-3" width="w-56" />
      </section>
      <section className="space-y-1.5" aria-hidden>
        <SkeletonSectionHeader />
        <SkeletonRows rows={6} trailing="chevron" />
      </section>
    </SkeletonPage>
  );
}

/** Mirrors `BudgetBoard` (timeline tab) inside the budget layout shell. */
export function BudgetSkeleton() {
  return (
    <SkeletonPage className="gap-3 py-4">
      <div aria-hidden>
        <div className="flex h-11 items-center gap-2">
          <SkeletonBar className="h-5 w-10" />
          <SkeletonBar className="h-[21px] w-11 rounded-full" />
        </div>
        <section className="rounded-xl border border-line bg-surface px-3 py-2 md:max-w-xl">
          <SkeletonLine box="h-5" bar="h-3" width="w-4/5" />
          <div className="mt-1.5 h-1.5 rounded-full bg-canvas" />
          <SkeletonLine box="mt-1 h-[17px]" bar="h-2.5" width="w-24" />
        </section>
        <div className="md:max-w-xl">
          <SkeletonSegmented count={3} />
        </div>
        <SkeletonChips count={7} className="md:max-w-xl" />
        <ol className="mt-2 grid gap-2 md:max-w-xl">
          {[2, 5, 4].map((rows, group) => (
            <li key={group}>
              <div className="-mx-1 mb-0.5 flex h-7 items-center justify-between gap-2 px-1">
                <SkeletonBar className="h-2.5 w-20" />
                <SkeletonBar className="h-2.5 w-14" />
              </div>
              <ul className="divide-y divide-line/70">
                {Array.from({ length: rows }, (_, index) => (
                  <li
                    key={index}
                    className="flex min-h-11 min-w-0 items-center gap-2 py-1.5"
                  >
                    <SkeletonBar className="h-6 w-6 shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1">
                      <SkeletonBar
                        className={`h-3 ${index % 2 ? "w-24" : "w-32"}`}
                      />
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <SkeletonBar className="h-3 w-14" />
                      <SkeletonBar className="h-2 w-12" />
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </SkeletonPage>
  );
}

/** Expense detail body; rendered inside the persistent `SlideInPage`. */
export function ExpenseDetailSkeleton() {
  return (
    <SkeletonPage className="pt-4">
      <div className="flex items-start gap-2.5" aria-hidden>
        <SkeletonBar className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <SkeletonLine box="h-6" bar="h-4" width="w-32" />
          <SkeletonLine box="mt-0.5 h-[18px]" bar="h-2.5" width="w-48" />
        </div>
      </div>
      <div className="grid gap-3" aria-hidden>
        {[0, 1, 2, 3, 4].map((field) => (
          <div key={field} className="grid gap-1">
            <SkeletonLine box="h-[18px]" bar="h-2.5" width="w-10" />
            {field === 3 ? (
              <div className="flex gap-1.5">
                {Array.from({ length: 6 }, (_, chip) => (
                  <span
                    key={chip}
                    className="h-8 w-12 rounded-full border border-line bg-surface"
                  />
                ))}
              </div>
            ) : (
              <div className="h-9 rounded-lg border border-line bg-surface" />
            )}
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}

/** Map area placeholder (used before Leaflet's chunk loads). */
export function MapAreaSkeleton({ className = "" }: { className?: string }) {
  const { t } = useT();
  return (
    <div
      role="status"
      aria-label={t("map.loading")}
      className={`relative h-full min-h-[inherit] w-full overflow-hidden bg-canvas ${className}`.trim()}
    >
      <SkeletonBar className="absolute inset-0 rounded-none bg-ink/[0.04]" />
    </div>
  );
}

const SHEET_DAY_GROUPS = [3, 3] as const;

/**
 * `/map` while loading: map area + floating controls + the city sheet at its
 * default mid height (45dvh on phones, 360px side panel on ≥1024px), so the
 * real drawer opens in place.
 */
export function TripMapSkeleton() {
  const { t } = useT();
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t("map.loading")}
      className="relative h-full w-full overflow-hidden bg-canvas"
    >
      <SkeletonBar className="absolute inset-0 rounded-none bg-ink/[0.04]" />
      <div
        aria-hidden
        className="absolute left-3 top-[max(0.5rem,env(safe-area-inset-top,0px))] h-11 w-[86px] rounded-full border border-line bg-surface/95 shadow-sm lg:left-[372px]"
      />
      <div
        aria-hidden
        className="absolute right-2 top-[max(0.5rem,env(safe-area-inset-top,0px))] flex flex-col gap-2"
      >
        {[0, 1, 2].map((control) => (
          <span
            key={control}
            className="h-11 w-11 rounded-sm border border-black/20 bg-surface shadow-sm"
          />
        ))}
      </div>
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 flex h-[45dvh] flex-col rounded-t-2xl border border-line bg-surface shadow-[0_-8px_24px_rgba(0,0,0,0.12)] lg:inset-y-0 lg:left-0 lg:right-auto lg:h-full lg:w-[360px] lg:rounded-none lg:border-y-0 lg:border-l-0"
      >
        <div className="flex min-h-11 shrink-0 items-center justify-center lg:justify-start lg:px-4">
          <span className="block h-1 w-10 rounded-full bg-line lg:hidden" />
          <SkeletonBar className="hidden h-3.5 w-12 lg:block" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-4">
          <ul className="space-y-4">
            {SHEET_DAY_GROUPS.map((count, group) => (
              <li key={group}>
                <div className="mb-1.5 flex h-[23px] items-center gap-2">
                  <SkeletonBar className="h-3.5 w-8" />
                  <SkeletonBar className="h-3 w-7" />
                </div>
                <ul className="space-y-1">
                  {Array.from({ length: count }, (_, row) => (
                    <li
                      key={row}
                      className="flex min-h-11 items-center justify-between gap-3 px-3"
                    >
                      <span className="min-w-0 flex-1">
                        <SkeletonLine
                          box="h-5"
                          bar="h-3"
                          width={row % 2 ? "w-32" : "w-40"}
                        />
                        <SkeletonLine box="h-4" bar="h-2.5" width="w-28" />
                      </span>
                      <SkeletonBar className="h-2 w-3" />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const SCHEDULE_ROWS = 6;

/**
 * Full-screen schedule: day map on top, sheet at the default 72% snap with
 * handle, day tabs, sticky day header and timeline rows (2.5rem time column).
 */
export function ScheduleSkeleton() {
  return (
    <SkeletonStatus className="flex h-dvh flex-col overflow-hidden">
      <div className="relative z-0 min-h-0 flex-1 overflow-hidden bg-canvas" aria-hidden>
        <SkeletonBar className="absolute inset-0 rounded-none bg-ink/[0.04]" />
        <span className="absolute left-2 top-[max(0.5rem,env(safe-area-inset-top,0px))] h-9 w-9 rounded-full bg-surface/90 shadow-sm" />
      </div>
      <section
        aria-hidden
        className="relative z-20 flex min-h-64 shrink-0 flex-col overflow-hidden rounded-t-2xl border-t border-line bg-surface shadow-[0_-8px_32px_rgba(28,25,23,0.12)]"
        style={{ height: "72%", maxHeight: "calc(100% - 2.75rem)" }}
      >
        <div className="flex shrink-0 flex-col items-center pt-2 pb-1">
          <span className="h-1 w-10 rounded-full bg-ink-muted/35" />
        </div>
        <div className="flex h-[37px] shrink-0 items-center justify-between overflow-hidden border-b border-line px-2">
          {Array.from({ length: 7 }, (_, tab) => (
            <span
              key={tab}
              className="flex h-9 min-w-[3.25rem] items-center justify-center gap-1 px-1.5"
            >
              <SkeletonBar className="h-2.5 w-5" />
              <SkeletonBar className="h-3 w-4" />
            </span>
          ))}
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas">
          <div className="border-b border-line bg-surface px-3 py-2">
            <div className="flex min-h-11 items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <SkeletonLine box="h-6" bar="h-4" width="w-40" />
                <SkeletonLine box="mt-0.5 h-4" bar="h-2.5" width="w-56" />
              </div>
              <div className="flex shrink-0 items-center gap-3 pr-1.5">
                <SkeletonBar className="h-3 w-9" />
                <SkeletonBar className="h-4 w-4 rounded-full" />
                <SkeletonBar className="h-3.5 w-7" />
              </div>
            </div>
          </div>
          <ol className="px-3 pt-2">
            {Array.from({ length: SCHEDULE_ROWS }, (_, row) => (
              <li key={row}>
                {row > 0 ? (
                  <div className="grid h-[18px] grid-cols-[2.5rem_1.25rem_minmax(0,1fr)] items-center gap-x-1.5">
                    <span />
                    <span className="mx-auto h-full w-px bg-line" />
                    <SkeletonBar className="h-2 w-28 opacity-60" />
                  </div>
                ) : null}
                <div className="grid h-11 grid-cols-[2.5rem_1.25rem_minmax(0,1fr)] items-center gap-x-1.5 border-b border-line/70">
                  <SkeletonBar className="h-2.5 w-8 justify-self-end" />
                  <SkeletonBar className="mx-auto h-4 w-4 rounded-full" />
                  <SkeletonBar
                    className={`h-3.5 ${row % 3 === 1 ? "w-[45%]" : row % 3 === 2 ? "w-[62%]" : "w-[52%]"}`}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <span
        aria-hidden
        className="fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] left-4 z-30 h-11 w-[82px] rounded-full border border-line bg-surface/95 shadow-[0_4px_16px_rgba(28,25,23,0.10)]"
      />
    </SkeletonStatus>
  );
}
