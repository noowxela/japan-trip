"use client";

import { EmptyState } from "@/components/empty-state";
import { SpendItemCard } from "@/components/spend-item-card";
import { yenForMyr } from "@/lib/exchange";
import { formatRm, formatTime, formatTimelineDate, formatYen } from "@/lib/format";
import { spendWhen, timelineGroups } from "@/lib/spend";
import type { SpendItem, TripDay } from "@/lib/types";

const ROW = "grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-x-3";

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
  const groups = timelineGroups(items, days, jpyPerRm);

  if (groups.length === 0) {
    return (
      <EmptyState title="No expenses yet">
        Expenses appear here once someone logs a spend.
      </EmptyState>
    );
  }

  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-8 w-px -translate-x-1/2 bg-sage"
      />
      <ol>
        {groups.map((group) => {
          const dateLabel = formatTimelineDate(group.date);
          return (
            <li key={group.key}>
              <div className={ROW}>
                <p className="relative z-10 bg-paper py-1 text-center text-sm font-medium leading-tight text-[#5f8f8c]">
                  {dateLabel ? (
                    <>
                      <span className="block">{dateLabel.year}</span>
                      <span className="block">{dateLabel.dayMonth}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                <p className="pt-1 text-right text-sm font-medium text-stone-800">
                  {formatAmount(group.totalRm, displayYen, jpyPerRm)}
                </p>
              </div>
              <ul>
                {group.items.map((item) => {
                  const time = formatTime(spendWhen(item, days));
                  return (
                    <li key={item.id} className={`${ROW} py-2`}>
                      {time ? (
                        <p className="relative z-10 bg-paper pt-3.5 text-center text-sm font-medium tabular-nums text-stone-800">
                          {time}
                        </p>
                      ) : (
                        <div className="relative z-10 flex justify-center bg-paper pt-5">
                          <span
                            aria-label="No time"
                            className="mt-0.5 h-2 w-2 rounded-full bg-stone-400"
                          />
                        </div>
                      )}
                      <SpendItemCard
                        item={item}
                        jpyPerRm={jpyPerRm}
                        displayYen={displayYen}
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
