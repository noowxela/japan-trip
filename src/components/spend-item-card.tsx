"use client";

import Link from "next/link";
import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { textWrapClass } from "@/components/compact/classes";
import { useT } from "@/components/i18n-provider";
import { SpendCategoryIcon } from "@/components/spend-category-icon";
import { SpendItemContextMenu } from "@/components/spend-item-context-menu";
import { yenForMyr } from "@/lib/exchange";
import { spendCategoryEmoji } from "@/lib/category-icon";
import { formatRm, formatSpend, formatYen } from "@/lib/format";
import { labelCategory } from "@/lib/i18n/dictionaries";
import {
  captureGestureOrigin,
  gestureWasScroll,
  haptic,
  type GestureOrigin,
} from "@/lib/haptic";
import { toRm } from "@/lib/spend";
import { linkedPlaceLabel } from "@/lib/spend-place";
import { LONG_PRESS_MS, shouldCancelLongPress } from "@/lib/swipe";
import { JPY_PER_RM, type Place, type SpendItem, type TripDay } from "@/lib/types";

type AnchorRect = { top: number; left: number; width: number; height: number };

export function SpendItemCard({
  item,
  jpyPerRm = JPY_PER_RM,
  displayYen = false,
  compact = false,
  timeLabel,
  places = [],
  days = [],
  shareRm = null,
}: {
  item: SpendItem;
  jpyPerRm?: number;
  displayYen?: boolean;
  compact?: boolean;
  /** Optional time shown before the icon on compact rows (no leading bullet). */
  timeLabel?: string | null;
  places?: Place[];
  days?: TripDay[];
  /** When set, show this RM share as the primary amount, with the full amount second. */
  shareRm?: number | null;
}) {
  const { t, locale } = useT();
  const gesture = useRef<GestureOrigin | null>(null);
  const press = useRef<{
    pointerId: number;
    x: number;
    y: number;
    timer: number | null;
    fired: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [menu, setMenu] = useState<{ open: boolean; anchor: AnchorRect | null }>(
    { open: false, anchor: null },
  );
  const pendingSync = item.id.startsWith("outbox:");
  const place = linkedPlaceLabel(item, places);
  const placeChip =
    place && !place.missing && place.name && place.name !== item.name
      ? place.name
      : null;

  const categoryLabel = labelCategory(locale, item.category);
  const emoji = spendCategoryEmoji(item.category);

  const bodyProps = {
    item,
    compact,
    timeLabel,
    pendingSync,
    placeChip,
    categoryLabel,
    emoji,
    displayYen,
    jpyPerRm,
    shareRm,
    pendingLabel: t("offline.pendingChip"),
  };

  function clearPress() {
    const current = press.current;
    if (current?.timer != null) window.clearTimeout(current.timer);
    press.current = null;
  }

  function openMenuFrom(target: HTMLElement) {
    const current = press.current;
    if (current) {
      if (current.timer != null) window.clearTimeout(current.timer);
      current.fired = true;
      current.timer = null;
    }
    const rect = target.getBoundingClientRect();
    suppressClick.current = true;
    haptic("tap");
    setMenu({
      open: true,
      anchor: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  }

  const onPointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    if (!event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    gesture.current = captureGestureOrigin(
      event.clientX,
      event.clientY,
      event.currentTarget,
    );
    suppressClick.current = false;
    const current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      timer: null as number | null,
      fired: false,
    };
    current.timer = window.setTimeout(() => {
      const active = press.current;
      if (!active || active.pointerId !== current.pointerId || active.fired) {
        return;
      }
      active.fired = true;
      active.timer = null;
      openMenuFrom(event.currentTarget);
    }, LONG_PRESS_MS);
    press.current = current;
  };

  const onPointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    const active = press.current;
    if (!active || active.pointerId !== event.pointerId || active.fired) return;
    if (shouldCancelLongPress(event.clientX - active.x, event.clientY - active.y)) {
      clearPress();
    }
  };

  const onPointerEnd = (event: PointerEvent<HTMLAnchorElement>) => {
    const active = press.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (!active.fired) clearPress();
    else press.current = null;
  };

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const start = gesture.current;
    gesture.current = null;
    if (suppressClick.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;
      return;
    }
    if (
      start &&
      gestureWasScroll(start, event.clientX, event.clientY, event.currentTarget)
    ) {
      event.preventDefault();
    }
  };

  const onContextMenu = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (pendingSync) return;
    // Mouse right-click should open the same menu; touch long-press already did.
    if (menu.open) return;
    if (press.current?.fired) return;
    openMenuFrom(event.currentTarget);
  };

  const className = compact
    ? "spend-item-row notebook-press relative flex min-h-11 min-w-0 touch-pan-y items-start gap-2 py-1.5"
    : "spend-item-row notebook-press relative flex min-w-0 touch-pan-y items-start gap-3 notebook-card p-3";

  if (pendingSync) {
    return (
      <div
        className={
          compact
            ? "spend-item-row relative flex min-h-11 min-w-0 items-start gap-2 py-1.5"
            : "spend-item-row relative flex min-w-0 items-start gap-3 notebook-card p-3"
        }
      >
        <SpendItemBody {...bodyProps} />
      </div>
    );
  }

  return (
    <>
      <Link
        href={`/budget/${item.id}`}
        className={className}
        scroll={false}
        data-no-haptic=""
        draggable={false}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onDragStart={(event) => event.preventDefault()}
      >
        <SpendItemBody {...bodyProps} />
      </Link>
      <SpendItemContextMenu
        item={item}
        days={days}
        open={menu.open}
        anchor={menu.anchor}
        preview={
          <div
            className={
              compact
                ? "flex min-h-11 min-w-0 items-start gap-2"
                : "flex min-w-0 items-start gap-3"
            }
          >
            <SpendItemBody {...bodyProps} />
          </div>
        }
        onClose={() => setMenu({ open: false, anchor: menu.anchor })}
      />
    </>
  );
}

function SpendItemBody({
  item,
  compact,
  timeLabel,
  pendingSync,
  placeChip,
  categoryLabel,
  emoji,
  displayYen,
  jpyPerRm,
  shareRm,
  pendingLabel,
}: {
  item: SpendItem;
  compact: boolean;
  timeLabel?: string | null;
  pendingSync: boolean;
  placeChip: string | null;
  categoryLabel: string | null;
  emoji: string;
  displayYen: boolean;
  jpyPerRm: number;
  shareRm?: number | null;
  pendingLabel: string;
}) {
  if (compact) {
    return (
      <>
        {timeLabel ? (
          <span className="w-10 shrink-0 whitespace-nowrap text-right text-[11px] font-semibold tabular-nums leading-4 text-ink">
            {timeLabel}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-start gap-1.5 text-[13px] leading-4">
            <span
              role="img"
              aria-label={categoryLabel ?? undefined}
              title={categoryLabel ?? undefined}
              className="shrink-0 text-[14px] leading-none"
            >
              {emoji}
            </span>
            <span className={`${textWrapClass} flex-1 font-medium`}>{item.name}</span>
          </p>
          {pendingSync || item.paidBy || placeChip ? (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {pendingSync ? (
                <span className="w-fit rounded-full bg-maybe-soft px-1.5 py-px text-[10px] font-medium text-maybe">
                  {pendingLabel}
                </span>
              ) : null}
              {item.paidBy ? (
                <span className="w-fit rounded-full bg-canvas px-1.5 py-px text-[10px] font-medium text-ink-muted">
                  {item.paidBy}
                </span>
              ) : null}
              {placeChip ? (
                <span className="w-fit max-w-full break-words [overflow-wrap:anywhere] rounded-full bg-canvas px-1.5 py-px text-[10px] font-medium text-ink-muted">
                  {placeChip}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <SpendAmounts
          item={item}
          displayYen={displayYen}
          jpyPerRm={jpyPerRm}
          compact
          shareRm={shareRm}
        />
      </>
    );
  }

  return (
    <>
      <SpendCategoryIcon category={item.category} />
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${textWrapClass}`}>{item.name}</p>
        {item.notes ? (
          <p className={`mt-0.5 text-xs text-ink-muted ${textWrapClass}`}>{item.notes}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-1">
          {pendingSync ? (
            <span className="w-fit rounded-full bg-maybe-soft px-2 py-0.5 text-[11px] font-medium text-maybe">
              {pendingLabel}
            </span>
          ) : null}
          {item.paidBy ? (
            <span className="w-fit rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              {item.paidBy}
            </span>
          ) : null}
          {placeChip ? (
            <span className="w-fit rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted">
              {placeChip}
            </span>
          ) : null}
        </div>
      </div>
      <SpendAmounts item={item} displayYen={displayYen} jpyPerRm={jpyPerRm} shareRm={shareRm} />
    </>
  );
}

export function SpendAmounts({
  item,
  displayYen,
  jpyPerRm,
  compact = false,
  shareRm = null,
}: {
  item: SpendItem;
  displayYen: boolean;
  jpyPerRm: number;
  compact?: boolean;
  shareRm?: number | null;
}) {
  const { t } = useT();
  const rm = toRm(item.amount, item.currency, jpyPerRm);
  const showShare = shareRm != null && Math.abs(shareRm - rm) > 1e-9;
  const showConversion =
    !showShare &&
    ((displayYen && item.currency === "RM") ||
      (!displayYen && item.currency === "Yen"));

  return (
    <div className="shrink-0 text-right">
      <p
        className={`font-medium whitespace-nowrap tabular-nums ${
          compact ? "text-[13px] leading-4" : "text-sm"
        }`}
      >
        {showShare
          ? formatAmount(shareRm, displayYen, jpyPerRm)
          : formatSpend(item.amount, item.currency)}
      </p>
      {showShare ? (
        <p
          className={`whitespace-nowrap tabular-nums text-ink-muted ${
            compact ? "text-[10px] leading-3" : "mt-0.5 text-xs"
          }`}
        >
          {t("budget.fullAmount", {
            amount: formatAmount(rm, displayYen, jpyPerRm),
          })}
        </p>
      ) : showConversion ? (
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

function formatAmount(rm: number, displayYen: boolean, jpyPerRm: number) {
  return displayYen ? formatYen(yenForMyr(rm, jpyPerRm)) : formatRm(rm);
}

