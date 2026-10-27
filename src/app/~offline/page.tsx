"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import {
  CompactRow,
  CompactRowList,
  PageHeader,
  SectionHeader,
  compactBtnPrimaryClass,
} from "@/components/compact";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/components/i18n-provider";
import { buildAgenda, pickFocusDay } from "@/lib/trip-core";
import { dateKey, formatDay, formatTime, tokyoToday } from "@/lib/format";
import {
  readTripCache,
  subscribeTripCache,
  type TripSnapshot,
} from "@/lib/trip-cache";

function getSnapshot(): TripSnapshot | null {
  return readTripCache();
}

function getServerSnapshot(): TripSnapshot | null {
  return null;
}

export default function OfflineFallbackPage() {
  const { t, locale } = useT();
  const router = useRouter();
  const snapshot = useSyncExternalStore(
    subscribeTripCache,
    getSnapshot,
    getServerSnapshot,
  );
  const today = tokyoToday();

  const view = useMemo(() => {
    if (!snapshot || snapshot.days.length === 0) return null;
    const focus = pickFocusDay(snapshot.days, today) ?? snapshot.days[0];
    const dated = snapshot.days.filter((day) => day.date);
    const focusIdx = dated.findIndex((day) => day.id === focus.id);
    const nextDay =
      focusIdx >= 0 && focusIdx < dated.length - 1 ? dated[focusIdx + 1] : null;

    function agendaFor(dayId: string) {
      const places = snapshot!.places.filter((place) =>
        place.dayIds.includes(dayId),
      );
      const transit = snapshot!.transit.filter((item) =>
        item.dayIds.includes(dayId),
      );
      return buildAgenda(places, transit);
    }

    return {
      focus,
      focusAgenda: agendaFor(focus.id),
      nextDay,
      nextAgenda: nextDay ? agendaFor(nextDay.id) : [],
      savedAt: snapshot.savedAt,
    };
  }, [snapshot, today]);

  const savedTime = formatTime(view?.savedAt ?? null) ?? "--:--";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-3 px-4 py-4 pb-24 md:max-w-5xl md:px-8">
      <PageHeader
        eyebrow={t("offline.pageEyebrow")}
        title={t("offline.pageTitle")}
        action={
          <button
            type="button"
            onClick={() => {
              router.push("/");
              router.refresh();
            }}
            className={compactBtnPrimaryClass}
          >
            {t("offline.retry")}
          </button>
        }
      />
      <p className="-mt-1 text-[12px] tabular-nums text-ink-muted">
        {t("offline.lastUpdated", { time: savedTime })}
      </p>

      {!view ? (
        <EmptyState title={t("offline.noCacheTitle")}>
          {t("offline.noCacheBody")}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          <DayBlock
            title={
              dateKey(view.focus.date) === today
                ? t("offline.today")
                : view.focus.name
            }
            subtitle={formatDay(view.focus.date, locale)}
            agenda={view.focusAgenda}
            empty={t("offline.noStops")}
          />
          {view.nextDay ? (
            <DayBlock
              title={t("offline.nextDay", { name: view.nextDay.name })}
              subtitle={formatDay(view.nextDay.date, locale)}
              agenda={view.nextAgenda}
              empty={t("offline.noStops")}
            />
          ) : null}
          <p className="text-center text-[13px]">
            <Link
              href="/schedule"
              className="font-medium text-ink-muted no-underline"
            >
              {t("common.openSchedule")}
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}

function DayBlock({
  title,
  subtitle,
  agenda,
  empty,
}: {
  title: string;
  subtitle: string;
  agenda: ReturnType<typeof buildAgenda>;
  empty: string;
}) {
  return (
    <section>
      <SectionHeader title={title} right={subtitle} />
      {agenda.length === 0 ? (
        <p className="px-1 text-[13px] text-ink-muted">{empty}</p>
      ) : (
        <CompactRowList>
          {agenda.map((item) => (
            <li key={`${item.kind}:${item.id}`}>
              <CompactRow
                leading={
                  <span className="tabular-nums text-[11px]">
                    {formatTime(item.start) ?? "—"}
                  </span>
                }
                title={item.name}
                meta={item.chip ?? undefined}
              />
            </li>
          ))}
        </CompactRowList>
      )}
    </section>
  );
}
