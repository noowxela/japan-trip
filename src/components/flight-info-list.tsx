import Link from "next/link";
import {
  CompactRow,
  CompactRowList,
  SectionHeader,
} from "@/components/compact";
import { formatDay, formatTime } from "@/lib/format";
import { labelMode, t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import type { Transit } from "@/lib/types";

type FlightInfoListProps = {
  flights: Transit[];
  dayNames: Map<string, string>;
};

export async function FlightInfoList({ flights, dayNames }: FlightInfoListProps) {
  const locale = await getLocale();

  if (flights.length === 0) {
    return (
      <div>
        <SectionHeader title={t(locale, "overview.flights")} />
        <CompactRowList>
          <li>
            <CompactRow
              href="/transit"
              title={t(locale, "flight.emptyTitle")}
              secondary={t(locale, "flight.emptyBody")}
              trailing={
                <span className="pr-2 text-[12px] text-ink-muted" aria-hidden>
                  ›
                </span>
              }
            />
          </li>
        </CompactRowList>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title={t(locale, "flight.title")}
        right={String(flights.length)}
      />
      <CompactRowList>
        {flights.map((flight) => {
          const dayLabel = flight.dayIds
            .map((id) => dayNames.get(id))
            .filter(Boolean)
            .join(", ");
          const when = [
            flight.date ? formatDay(flight.date, locale) : t(locale, "flight.dateTbd"),
            formatTime(flight.start),
          ]
            .filter(Boolean)
            .join(" · ");
          const route =
            [flight.from, flight.to].filter(Boolean).join(" → ") ||
            t(locale, "flight.routeTbd");
          return (
            <li key={flight.id}>
              <CompactRow
                leading={
                  <span className="text-[10px] font-medium text-ink-muted">
                    {labelMode(locale, "Flight")}
                  </span>
                }
                title={flight.name}
                meta={route}
                secondary={[when, dayLabel].filter(Boolean).join(" · ")}
                trailing={
                  flight.bookingUrl ? (
                    <a
                      href={flight.bookingUrl}
                      className="pr-2 text-[11px] font-medium text-ink-muted no-underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t(locale, "flight.viewBooking")}
                    </a>
                  ) : null
                }
              />
            </li>
          );
        })}
      </CompactRowList>
      <p className="mt-1.5 px-1 text-[12px]">
        <Link href="/transit" className="font-medium text-ink-muted no-underline">
          {t(locale, "flight.addLink")}
        </Link>
      </p>
    </div>
  );
}
