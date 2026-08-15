import { AddTransitForm } from "@/components/add-transit-form";
import { EmptyState } from "@/components/empty-state";
import { Nav } from "@/components/nav";
import { formatDay } from "@/lib/format";
import { getDays, getTransit } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function TransitPage() {
  const [days, transit] = await Promise.all([getDays(), getTransit()]);
  const dayNames = new Map(days.map((day) => [day.id, day.name]));

  return (
    <>
      <Nav current="/lists" />
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            Moves
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Transit</h1>
        </div>
        {transit.length === 0 ? (
          <EmptyState title="No transit yet">
            Add a train or flight below, or in the Transit database in Notion.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {transit.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-stone-200 bg-white p-4"
              >
                <p className="text-xs text-stone-500">
                  {[item.mode, item.date ? formatDay(item.date) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-lg font-medium">{item.name}</p>
                <p className="text-sm text-stone-600">
                  {[item.from, item.to].filter(Boolean).join(" → ")}
                </p>
                <p className="text-sm text-stone-500">
                  {item.dayIds
                    .map((id) => dayNames.get(id))
                    .filter(Boolean)
                    .join(", ") || "Unscheduled"}
                </p>
                {item.bookingUrl ? (
                  <a
                    href={item.bookingUrl}
                    className="text-sm text-[#b42318] underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Booking
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <AddTransitForm days={days} />
      </main>
    </>
  );
}
