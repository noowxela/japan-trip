"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/components/i18n-provider";
import { SpendItemCard } from "@/components/spend-item-card";
import { yenForMyr } from "@/lib/exchange";
import {
  formatRm,
  formatTime,
  formatTimelineDate,
  formatYen,
  isPastTripDay,
  tokyoToday,
} from "@/lib/format";
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
  const today = useMemo(() => tokyoToday(), []);
  const [openByKey, setOpenByKey] = useState<Record<string, boolean>>({});

  if (groups.length === 0) {
    return (
      <EmptyState title={t("budget.empty")}>
        {t("budget.timelineEmpty")}
      </EmptyState>
    );
  }

  function isOpen(key: string, date: string | null) {
    if (Object.prototype.hasOwnProperty.call(openByKey, key)) {
      return openByKey[key]!;
    }
    // Today + future + unscheduled open; past dates collapsed (Tokyo calendar).
    return !isPastTripDay(date, today);
  }

  function toggle(key: string, date: string | null) {
    setOpenByKey((prev) => ({
      ...prev,
      [key]: !isOpen(key, date),
    }));
  }

  return (
    <div className="relative">
      <ol className="grid gap-2">
        {groups.map((group) => {
          const dateLabel = formatTimelineDate(group.date, locale) ?? "—";
          const open = isOpen(group.key, group.date);
          return (
            <li key={group.key}>
              <button
                type="button"
                aria-expanded={open}
                aria-label={
                  open
                    ? t("budget.collapseDay", { date: dateLabel })
                    : t("budget.expandDay", { date: dateLabel })
                }
                onClick={() => toggle(group.key, group.date)}
                className="sticky top-0 z-10 -mx-1 mb-0.5 flex h-7 w-full items-center justify-between gap-2 bg-canvas/95 px-1 text-left backdrop-blur-sm"
              >
                <span className="flex min-w-0 items-center gap-1 truncate text-[11px] font-medium text-ink">
                  <span aria-hidden className="shrink-0 text-[10px] text-ink-muted">
                    {open ? "▾" : "▸"}
                  </span>
                  <span className="truncate">{dateLabel}</span>
                </span>
                <span className="shrink-0 text-[11px] font-medium text-ink tabular-nums">
                  {formatAmount(group.totalRm, displayYen, jpyPerRm)}
                </span>
              </button>
              {open ? (
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
              ) : null}
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
