"use client";

import Link from "next/link";
import { SpendCategoryIcon } from "@/components/spend-category-icon";
import { yenForMyr } from "@/lib/exchange";
import { formatRm, formatSpend, formatYen } from "@/lib/format";
import { toRm } from "@/lib/spend";
import { JPY_PER_RM, type SpendItem } from "@/lib/types";

export function SpendItemCard({
  item,
  jpyPerRm = JPY_PER_RM,
  displayYen = false,
}: {
  item: SpendItem;
  jpyPerRm?: number;
  displayYen?: boolean;
}) {
  return (
    <Link
      href={`/budget/${item.id}`}
      className="notebook-press flex min-w-0 items-start gap-3 notebook-card p-3"
      scroll={false}
    >
      <SpendCategoryIcon category={item.category} />
      <div className="min-w-0 flex-1">
        <p className="font-medium break-words">{item.name}</p>
        {item.notes ? (
          <p className="mt-0.5 truncate text-xs text-stone-500">{item.notes}</p>
        ) : null}
        {item.paidBy ? (
          <p className="mt-1 w-fit rounded-full bg-sage/70 px-2 py-0.5 text-[11px] font-medium text-stone-600">
            {item.paidBy}
          </p>
        ) : null}
      </div>
      <SpendAmounts item={item} displayYen={displayYen} jpyPerRm={jpyPerRm} />
    </Link>
  );
}

export function SpendAmounts({
  item,
  displayYen,
  jpyPerRm,
}: {
  item: SpendItem;
  displayYen: boolean;
  jpyPerRm: number;
}) {
  const rm = toRm(item.amount, item.currency, jpyPerRm);
  const showConversion =
    (displayYen && item.currency === "RM") ||
    (!displayYen && item.currency === "Yen");

  return (
    <div className="shrink-0 text-right">
      <p className="text-sm font-medium whitespace-nowrap">
        {formatSpend(item.amount, item.currency)}
      </p>
      {showConversion ? (
        <p className="mt-0.5 text-xs text-stone-500 whitespace-nowrap">
          ≈ {displayYen ? formatYen(yenForMyr(rm, jpyPerRm)) : formatRm(rm)}
        </p>
      ) : null}
    </div>
  );
}
