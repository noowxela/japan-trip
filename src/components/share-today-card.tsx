"use client";

import { useMemo, useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";
import { cardClass } from "@/components/page-shell";
import { formatDay } from "@/lib/format";
import { formatDayShareText } from "@/lib/share-day";
import type { AgendaItem, TripDay } from "@/lib/types";

export function ShareTodayCard({
  day,
  items,
}: {
  day: TripDay | null;
  items: AgendaItem[];
}) {
  const { t, locale } = useT();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const text = useMemo(() => {
    if (!day) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return formatDayShareText({
      dayName: day.name,
      dateLabel: day.date ? formatDay(day.date, locale) : null,
      items,
      appUrl: origin
        ? `${origin}/schedule?day=${encodeURIComponent(day.id)}`
        : undefined,
    });
  }, [day, items, locale]);

  const dayLabel = day
    ? [day.name, day.date ? formatDay(day.date, locale) : null]
        .filter(Boolean)
        .join(" · ")
    : null;

  function share() {
    if (!day) return;
    start(async () => {
      const title = t("schedule.shareTitle", { day: day.name });
      try {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ title, text });
          return;
        }
        await navigator.clipboard.writeText(text);
        setToast(t("schedule.shareCopied"));
        window.setTimeout(() => setToast(null), 2000);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        try {
          await navigator.clipboard.writeText(text);
          setToast(t("schedule.shareCopied"));
          window.setTimeout(() => setToast(null), 2000);
        } catch {
          // ignore
        }
      }
    });
  }

  return (
    <div
      className={`${cardClass} relative flex min-h-11 items-center justify-between gap-3 !rounded-xl !p-3`}
    >
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-ink">
          {t("more.shareToday")}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          {day
            ? dayLabel
              ? t("more.shareTodayDetail", { day: dayLabel })
              : t("more.shareTodayDetailFallback")
            : t("more.shareTodayUnavailable")}
        </p>
      </div>
      <button
        type="button"
        onClick={share}
        disabled={pending || !day}
        className="notebook-btn inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-accent px-3 text-[13px] font-medium text-white disabled:opacity-50"
        aria-label={t("more.shareToday")}
      >
        {t("more.shareTodayAction")}
      </button>
      {toast ? (
        <span className="absolute right-3 top-full z-20 mt-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-surface">
          {toast}
        </span>
      ) : null}
    </div>
  );
}
