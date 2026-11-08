"use client";

import { useMemo, useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";
import { formatDay } from "@/lib/format";
import { formatDayShareText } from "@/lib/share-day";
import type { AgendaItem, TripDay } from "@/lib/types";

export function ShareDayButton({
  day,
  items,
}: {
  day: TripDay;
  items: AgendaItem[];
}) {
  const { t, locale } = useT();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const text = useMemo(() => {
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

  function share() {
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
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={share}
        disabled={pending}
        className="inline-flex min-h-9 items-center rounded-lg px-2 text-[12px] font-medium text-ink-muted disabled:opacity-50"
        aria-label={t("schedule.shareDay")}
      >
        {t("schedule.shareDay")}
      </button>
      {toast ? (
        <span className="absolute right-0 top-full z-20 mt-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-surface">
          {toast}
        </span>
      ) : null}
    </span>
  );
}
