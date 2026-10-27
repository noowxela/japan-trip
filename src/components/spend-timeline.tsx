"use client";

import { EmptyState } from "@/components/empty-state";
import { useT } from "@/components/i18n-provider";
import { SpendItemCard } from "@/components/spend-item-card";
import { yenForMyr } from "@/lib/exchange";
import { formatRm, formatTime, formatTimelineDate, formatYen } from "@/lib/format";
import { spendWhen, timelineGroups } from "@/lib/spend";
import type { SpendItem, TripDay } from "@/lib/types";

export function SpendTimeline({
  items,
  days,
  jpyPerRm,
  displayYen,
}: {
  items: SpendItem[];
  days: TripDay[];
  jpyPerRm: number;
  displayYen: boolean;
}) {
  const { t, locale } = useT();
  const groups = timelineGroups(items, days, jpyPerRm);

  if (groups.length === 0) {
    return (
      <EmptyState title={t("budget.empty")}>
        {t("budget.timelineEmpty")}
      </EmptyState>
    );
  }

  return (
    <div className="relative">
      <ol className="grid gap-2">
        {groups.map((group) => {
          const dateLabel = formatTimelineDate(group.date, locale);
          return (
            <li key={group.key}>
              <div className="sticky top-0 z-10 -mx-1 mb-0.5 flex h-7 items-center justify-between gap-2 bg-canvas/95 px-1 backdrop-blur-sm">
                <p className="truncate text-[11px] font-medium text-ink">
                  {dateLabel ?? "—"}
                </p>
                <p className="shrink-0 text-[11px] font-medium text-ink tabular-nums">
                  {formatAmount(group.totalRm, displayYen, jpyPerRm)}
                </p>
              </div>
              <ul className="divide-y divide-line/70">
                {group.items.map((item) => {
                  const time = formatTime(spendWhen(item, days));
                  return (
                    <li key={item.id} className="min-w-0">
                      <SpendItemCard
                        item={item}
                        jpyPerRm={jpyPerRm}
                        displayYen={displayYen}
                        compact
                        timeLabel={time}
                      />
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function formatAmount(
  rm: number,
  displayYen: boolean,
  jpyPerRm: number,
) {
  return displayYen ? formatYen(yenForMyr(rm, jpyPerRm)) : formatRm(rm);
}
