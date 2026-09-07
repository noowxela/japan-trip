import Link from "next/link";
import { MapsPinLink } from "@/components/maps-pin-link";
import { cardClass } from "@/components/page-shell";
import { formatDay, formatRm, formatTime } from "@/lib/format";
import { coordsOfPlace, coordsOfStay } from "@/lib/geocode";
import type { AgendaItem, Stay } from "@/lib/types";

export function NextStopCard({
  item,
  href,
  dayName,
  dayDate,
}: {
  item: AgendaItem | null;
  href: string;
  dayName: string;
  dayDate: string | null;
}) {
  if (!item) {
    return (
      <section className={cardClass}>
        <p className="text-xs uppercase tracking-wide text-moss">Next stop</p>
        <p className="mt-1 text-lg font-medium">Nothing scheduled</p>
        <p className="mt-1 text-sm text-stone-500">
          {dayName}
          {dayDate ? ` · ${formatDay(dayDate)}` : ""}
        </p>
        <Link href={href} className="mt-3 inline-block text-sm font-medium text-hanko">
          Open schedule →
        </Link>
      </section>
    );
  }

  const coords = coordsOfPlace({
    name: item.name,
    lat: item.lat,
    lng: item.lng,
  });

  return (
    <section className={`${cardClass} border-hanko/30`}>
      <p className="text-xs uppercase tracking-wide text-hanko">Next stop</p>
      <p className="mt-1 text-xs text-stone-500">
        {[formatTime(item.start) ?? "Anytime", item.chip, dayName]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="mt-1 flex items-start gap-1 text-lg font-medium">
        <span className="min-w-0 break-words">{item.name}</span>
        {item.kind === "place" ? (
          <MapsPinLink
            name={item.name}
            lat={coords?.lat}
            lng={coords?.lng}
            mapsUrl={item.mapsUrl}
            tone={item.chip === "Food" || item.chip === "Cafe" ? "food" : "sight"}
          />
        ) : null}
      </p>
      {item.detail ? (
        <p className="mt-1 text-sm text-stone-600">{item.detail}</p>
      ) : null}
      <Link href={href} className="mt-3 inline-block text-sm font-medium text-hanko">
        Open schedule →
      </Link>
    </section>
  );
}

export function TonightStayCard({
  stays,
  isTonight,
}: {
  stays: Stay[];
  isTonight: boolean;
}) {
  const label = isTonight ? "Tonight" : "Lodging";
  if (stays.length === 0) {
    return (
      <section className={cardClass}>
        <p className="text-xs uppercase tracking-wide text-moss">{label}</p>
        <p className="mt-1 text-lg font-medium">No stay booked</p>
        <Link href="/stays" className="mt-3 inline-block text-sm font-medium text-hanko">
          Stays →
        </Link>
      </section>
    );
  }

  return (
    <section className={cardClass}>
      <p className="text-xs uppercase tracking-wide text-moss">{label}</p>
      <ul className="mt-1 grid gap-3">
        {stays.map((stay) => {
          const coords = coordsOfStay(stay);
          return (
            <li key={stay.id}>
              <p className="flex items-start gap-1 text-lg font-medium">
                <span className="min-w-0 break-words">{stay.name}</span>
                <MapsPinLink
                  name={stay.address || stay.name}
                  lat={coords?.lat}
                  lng={coords?.lng}
                />
              </p>
              {stay.address ? (
                <p className="mt-0.5 text-sm text-stone-600">{stay.address}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TodaySpendCard({
  actual,
  estimate,
  href,
}: {
  actual: number;
  estimate: number;
  href: string;
}) {
  return (
    <section className={cardClass}>
      <p className="text-xs uppercase tracking-wide text-moss">Today spend</p>
      <p className="mt-1 text-2xl font-medium">{formatRm(actual)}</p>
      <p className="mt-1 text-sm text-stone-500">
        {estimate > 0
          ? `${formatRm(estimate)} estimated`
          : "No estimate for this day"}
      </p>
      <Link href={href} className="mt-3 inline-block text-sm font-medium text-hanko">
        Expenses →
      </Link>
    </section>
  );
}
