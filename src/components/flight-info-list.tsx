import Link from "next/link";
import { formatDay, formatTime } from "@/lib/format";
import type { Transit } from "@/lib/types";

type FlightInfoListProps = {
  flights: Transit[];
  dayNames: Map<string, string>;
};

export function FlightInfoList({ flights, dayNames }: FlightInfoListProps) {
  if (flights.length === 0) {
    return (
      <section className="notebook-card border-dashed bg-white/70 p-4 shadow-none">
        <p className="text-sm font-medium text-stone-700">No flights yet</p>
        <p className="mt-1 text-sm text-stone-500">
          Add flights in Transit, or link them to a day on the schedule.
        </p>
        <Link
          href="/transit"
          className="mt-3 inline-block text-sm font-medium text-hanko"
        >
          Add transit →
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
        Flights
      </h2>
      <ul className="grid gap-3">
        {flights.map((flight) => (
          <li
            key={flight.id}
            className="notebook-card min-w-0 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-moss">
                  {flight.date ? formatDay(flight.date) : "Date TBD"}
                  {formatTime(flight.start)
                    ? ` · ${formatTime(flight.start)}`
                    : ""}
                </p>
                <p className="mt-1 text-lg font-medium break-words">
                  {flight.name}
                </p>
                <p className="text-sm text-stone-600">
                  {[flight.from, flight.to].filter(Boolean).join(" → ") ||
                    "Route TBD"}
                </p>
                {flight.dayIds.length > 0 ? (
                  <p className="mt-1 text-xs text-stone-500">
                    {flight.dayIds
                      .map((id) => dayNames.get(id))
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                Flight
              </span>
            </div>
            {flight.bookingUrl ? (
              <a
                href={flight.bookingUrl}
                className="mt-3 inline-block text-sm text-hanko underline"
                target="_blank"
                rel="noreferrer"
              >
                View booking
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
