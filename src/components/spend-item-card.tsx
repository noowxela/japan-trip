"use client";

import Link from "next/link";
import { useRef, type MouseEvent, type PointerEvent } from "react";
import { useT } from "@/components/i18n-provider";
import { SpendCategoryIcon } from "@/components/spend-category-icon";
import { yenForMyr } from "@/lib/exchange";
import { formatRm, formatSpend, formatYen } from "@/lib/format";
import {
  captureGestureOrigin,
  gestureWasScroll,
  type GestureOrigin,
} from "@/lib/haptic";
import { toRm } from "@/lib/spend";
import { JPY_PER_RM, type SpendItem } from "@/lib/types";

export function SpendItemCard({
  item,
  jpyPerRm = JPY_PER_RM,
  displayYen = false,
  compact = false,
  timeLabel,
}: {
  item: SpendItem;
  jpyPerRm?: number;
  displayYen?: boolean;
  compact?: boolean;
  /** Optional time shown before the icon on compact rows (no leading bullet). */
  timeLabel?: string | null;
}) {
  const { t } = useT();
  const gesture = useRef<GestureOrigin | null>(null);
  const pendingSync = item.id.startsWith("outbox:");

  const onPointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    if (!event.isPrimary) return;
    gesture.current = captureGestureOrigin(
      event.clientX,
      event.clientY,
      event.currentTarget,
    );
  };

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const start = gesture.current;
    gesture.current = null;
    if (
      start &&
      gestureWasScroll(start, event.clientX, event.clientY, event.currentTarget)
    ) {
      event.preventDefault();
    }
  };

  const body = compact ? (
    <>
      {timeLabel ? (
        <span className="w-9 shrink-0 text-right text-[11px] font-medium tabular-nums text-ink-muted">
          {timeLabel}
        </span>
      ) : null}
      <SpendCategoryIcon category={item.category} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-[13px] leading-4">
          <span className="truncate font-medium">{item.name}</span>
          {pendingSync ? (
            <span className="shrink-0 rounded-full bg-maybe-soft px-1.5 py-px text-[10px] font-medium text-maybe">
              {t("offline.pendingChip")}
            </span>
          ) : null}
          {item.paidBy ? (
            <span className="shrink-0 rounded-full bg-canvas px-1.5 py-px text-[10px] font-medium text-ink-muted">
              {item.paidBy}
            </span>
          ) : null}
        </p>
      </div>
      <SpendAmounts
        item={item}
        displayYen={displayYen}
        jpyPerRm={jpyPerRm}
        compact
      />
    </>
  ) : (
    <>
      <SpendCategoryIcon category={item.category} />
      <div className="min-w-0 flex-1">
        <p className="font-medium break-words">{item.name}</p>
        {item.notes ? (
          <p className="mt-0.5 truncate text-xs text-ink-muted">{item.notes}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-1">
          {pendingSync ? (
            <span className="w-fit rounded-full bg-maybe-soft px-2 py-0.5 text-[11px] font-medium text-maybe">
              {t("offline.pendingChip")}
            </span>
          ) : null}
          {item.paidBy ? (
            <span className="w-fit rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              {item.paidBy}
            </span>
          ) : null}
        </div>
      </div>
      <SpendAmounts item={item} displayYen={displayYen} jpyPerRm={jpyPerRm} />
    </>
  );

  if (pendingSync) {
    return (
      <div
        className={
          compact
            ? "relative flex min-h-11 min-w-0 items-center gap-2 py-1.5"
            : "relative flex min-w-0 items-start gap-3 notebook-card p-3"
        }
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`/budget/${item.id}`}
      className={
        compact
          ? "notebook-press relative flex min-h-11 min-w-0 touch-pan-y items-center gap-2 py-1.5"
          : "notebook-press relative flex min-w-0 touch-pan-y items-start gap-3 notebook-card p-3"
      }
      scroll={false}
      data-no-haptic=""
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {body}
    </Link>
  );
}

export function SpendAmounts({
  item,
  displayYen,
  jpyPerRm,
  compact = false,
}: {
  item: SpendItem;
  displayYen: boolean;
  jpyPerRm: number;
  compact?: boolean;
}) {
  const rm = toRm(item.amount, item.currency, jpyPerRm);
  const showConversion =
    (displayYen && item.currency === "RM") ||
    (!displayYen && item.currency === "Yen");

  return (
    <div className="shrink-0 text-right">
      <p
        className={`font-medium whitespace-nowrap tabular-nums ${
          compact ? "text-[13px] leading-4" : "text-sm"
        }`}
      >
        {formatSpend(item.amount, item.currency)}
      </p>
      {showConversion ? (
        <p
          className={`whitespace-nowrap tabular-nums text-ink-muted ${
            compact ? "text-[11px] leading-3" : "mt-0.5 text-xs"
          }`}
        >
          ≈ {displayYen ? formatYen(yenForMyr(rm, jpyPerRm)) : formatRm(rm)}
        </p>
      ) : null}
    </div>
  );
}
