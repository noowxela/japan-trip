import Link from "next/link";
import { DirectionsLink } from "@/components/directions-link";
import { MapsPinLink } from "@/components/maps-pin-link";
import {
  CompactRow,
  CompactRowList,
} from "@/components/compact";
import { formatRm, formatTime } from "@/lib/format";
import { coordsOfPlace, coordsOfStay } from "@/lib/geocode";
import { labelMode, labelType, t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import type { AgendaItem, Stay } from "@/lib/types";

export async function NextStopBanner({
  item,
  href,
  dayName,
  dayDate,
  status = "next",
  done = false,
  nextDayItem = null,
  nextDayName,
  nextDayHref,
}: {
  item: AgendaItem | null;
  href: string;
  dayName: string;
  dayDate: string | null;
  status?: "now" | "next";
  done?: boolean;
  nextDayItem?: AgendaItem | null;
  nextDayName?: string;
  nextDayHref?: string;
}) {
  const locale = await getLocale();
  const label =
    status === "now" ? t(locale, "overview.now") : t(locale, "overview.nextStop");

  if (done || !item) {
    const secondary = [
      dayName,
      dayDate ? null : null,
      done && nextDayItem && nextDayName
        ? `${t(locale, "overview.upNext")} ${nextDayItem.name} · ${nextDayName}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <Link
        href={done && nextDayHref ? nextDayHref : href}
        className="flex min-h-12 items-center gap-2 rounded-xl border border-line border-l-[3px] border-l-accent bg-surface px-3 py-2 text-inherit no-underline"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium leading-5 text-ink">
            <span className="text-accent">{label}</span>
            <span className="text-ink-muted"> · </span>
            {done
              ? t(locale, "overview.allDone")
              : t(locale, "overview.nothingScheduled")}
          </p>
          {secondary ? (
            <p className="mt-0.5 truncate text-[12px] text-ink-muted">
              {secondary}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-[12px] text-ink-muted" aria-hidden>
          ›
        </span>
      </Link>
    );
  }

  const coords = coordsOfPlace({
    name: item.name,
    lat: item.lat,
    lng: item.lng,
  });
  const chipLabel =
    item.kind === "place"
      ? labelType(locale, item.chip)
      : labelMode(locale, item.chip);
  const time = formatTime(item.start) ?? t(locale, "common.anytime");

  return (
    <div className="flex min-h-12 items-center gap-1 rounded-xl border border-line border-l-[3px] border-l-accent bg-surface py-1 pl-3 pr-1">
      <Link href={href} className="min-w-0 flex-1 text-inherit no-underline">
        <p className="truncate text-[14px] font-medium leading-5 text-ink">
          <span className="text-accent">{label}</span>
          <span className="text-ink-muted"> · </span>
          <span className="tabular-nums">{time}</span>
          <span className="text-ink-muted"> · </span>
          {item.name}
          {chipLabel ? (
            <span className="font-normal text-ink-muted"> · {chipLabel}</span>
          ) : null}
        </p>
        {item.detail ? (
          <p className="mt-0.5 truncate text-[12px] text-ink-muted">
            {item.detail}
          </p>
        ) : (
          <p className="mt-0.5 truncate text-[12px] text-ink-muted">{dayName}</p>
        )}
      </Link>
      {item.kind === "place" ? (
        <div className="flex shrink-0 items-center">
          <MapsPinLink
            name={item.name}
            lat={coords?.lat}
            lng={coords?.lng}
            mapsUrl={item.mapsUrl}
            tone={item.chip === "Food" || item.chip === "Cafe" ? "food" : "sight"}
          />
          <DirectionsLink
            name={item.name}
            lat={coords?.lat}
            lng={coords?.lng}
            mapsUrl={item.mapsUrl}
          />
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer NextStopBanner — kept name alias for any leftover imports. */
export const NextStopCard = NextStopBanner;

export async function TripCompleteRow({
  dayCount,
  href = "/budget",
}: {
  dayCount: number;
  href?: string;
}) {
  const locale = await getLocale();
  return (
    <CompactRowList>
      <li>
        <CompactRow
          href={href}
          title={t(locale, "overview.tripComplete")}
          secondary={t(locale, "overview.tripCompleteBody", { n: dayCount })}
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

export const TripCompleteCard = TripCompleteRow;

export async function TonightStayRows({
  stays,
  isTonight,
}: {
  stays: Stay[];
  isTonight: boolean;
}) {
  const locale = await getLocale();
  const label = isTonight
    ? t(locale, "overview.tonight")
    : t(locale, "overview.stay");

  if (stays.length === 0) {
    return (
      <CompactRowList>
        <li>
          <CompactRow
            href="/stays"
            title={label}
            meta={t(locale, "overview.noStay")}
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
      {stays.map((stay) => {
        const coords = coordsOfStay(stay);
        return (
          <li key={stay.id} className="flex items-center">
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
                secondary={stay.address || undefined}
              />
            </div>
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

export const TonightStayCard = TonightStayRows;

export async function TodaySpendRow({
  actual,
  estimate,
  href,
}: {
  actual: number;
  estimate: number;
  href: string;
}) {
  const locale = await getLocale();
  return (
    <CompactRowList>
      <li>
        <CompactRow
          href={href}
          title={t(locale, "overview.spendToday")}
          meta={
            <span className="tabular-nums font-medium text-ink">
              {formatRm(actual)}
            </span>
          }
          secondary={
            estimate > 0
              ? t(locale, "overview.estimatedLine", { amount: formatRm(estimate) })
              : t(locale, "overview.noEstimate")
          }
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

export const TodaySpendCard = TodaySpendRow;
