"use client";

import { useSyncExternalStore } from "react";
import { CompactRow, CompactRowList, compactBtnPrimaryClass } from "@/components/compact";
import { useT } from "@/components/i18n-provider";
import { MapsPinLink } from "@/components/maps-pin-link";
import { useToast } from "@/components/toast-provider";
import {
  CHECKED_OUT_STAYS_CHANGED_EVENT,
  CHECKED_OUT_STAYS_STORAGE_KEY,
  EMPTY_CHECKED_OUT_STAYS,
  activeOverviewStays,
  checkedOutOverviewStays,
  invalidateCheckedOutStaysMemory,
  markStayCheckedOut,
  readCheckedOutStays,
  unmarkStayCheckedOut,
  writeCheckedOutStays,
} from "@/lib/checked-out-stays";
import { coordsOfStay } from "@/lib/geocode";
import { isStayCheckoutDay } from "@/lib/trip-core";
import type { Stay } from "@/lib/types";

function subscribeCheckedOut(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CHECKED_OUT_STAYS_STORAGE_KEY) {
      invalidateCheckedOutStaysMemory();
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHECKED_OUT_STAYS_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHECKED_OUT_STAYS_CHANGED_EVENT, onChange);
  };
}

export function OverviewStayRows({
  stays,
  isTonight,
  today,
}: {
  stays: Stay[];
  isTonight: boolean;
  today: string;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const checkedOut = useSyncExternalStore(
    subscribeCheckedOut,
    readCheckedOutStays,
    () => EMPTY_CHECKED_OUT_STAYS,
  );

  const active = activeOverviewStays(stays, today, checkedOut);
  const departed = checkedOutOverviewStays(stays, today, checkedOut);

  function markCheckedOut(stay: Stay) {
    const snapshot = checkedOut;
    writeCheckedOutStays(markStayCheckedOut(checkedOut, stay.id, stay.checkOut));
    toast(t("overview.checkedOutToast"), {
      actionLabel: t("common.undo"),
      onAction: () => {
        writeCheckedOutStays(
          unmarkStayCheckedOut(snapshot, stay.id, stay.checkOut),
        );
        toast(t("common.undone"));
      },
      durationMs: 6000,
    });
  }

  if (active.length === 0) {
    if (departed.length > 0) {
      return (
        <CompactRowList>
          {departed.map((stay) => (
            <li key={stay.id}>
              <CompactRow
                href="/stays"
                muted
                title={t("overview.stay")}
                meta={stay.name}
                secondary={t("overview.checkedOut")}
                trailing={
                  <span className="pr-2 text-[12px] text-ink-muted" aria-hidden>
                    ›
                  </span>
                }
              />
            </li>
          ))}
        </CompactRowList>
      );
    }
    return (
      <CompactRowList>
        <li>
          <CompactRow
            href="/stays"
            title={isTonight ? t("overview.tonight") : t("overview.stay")}
            meta={t("overview.noStay")}
            trailing={
              <span className="pr-2 text-[12px] text-ink-muted" aria-hidden>
                ›
              </span>
            }
          />
        </li>
      </CompactRowList>
    );
  }

  return (
    <CompactRowList>
      {active.map((stay) => {
        const checkoutDay = isStayCheckoutDay(stay, today);
        const label =
          checkoutDay || !isTonight
            ? t("overview.stay")
            : t("overview.tonight");
        const coords = coordsOfStay(stay);
        const hint = checkoutDay ? t("overview.checkoutToday") : null;
        return (
          <li key={stay.id} className="flex min-w-0 w-full items-center">
            <div className="min-w-0 flex-1">
              <CompactRow
                href="/stays"
                title={
                  <>
                    {label}
                    <span className="font-normal text-ink-muted"> · </span>
                    {stay.name}
                  </>
                }
                secondary={
                  hint
                    ? [hint, stay.address].filter(Boolean).join(" · ")
                    : stay.address || undefined
                }
              />
            </div>
            {checkoutDay ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  markCheckedOut(stay);
                }}
                className={`${compactBtnPrimaryClass} mr-1 shrink-0`}
              >
                {t("overview.markCheckedOut")}
              </button>
            ) : null}
            <MapsPinLink
              name={stay.address || stay.name}
              lat={coords?.lat}
              lng={coords?.lng}
            />
          </li>
        );
      })}
    </CompactRowList>
  );
}
