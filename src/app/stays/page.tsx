import { AddStayForm } from "@/components/add-stay-form";
import { EmptyState } from "@/components/empty-state";
import { Nav } from "@/components/nav";
import { formatRange } from "@/lib/format";
import { getStays } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function StaysPage() {
  const stays = await getStays();

  return (
    <>
      <Nav current="/lists" />
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            Lodging
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Stays</h1>
        </div>
        {stays.length === 0 ? (
          <EmptyState title="No stays yet">
            Add a hotel below, or in the Stays database in Notion.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {stays.map((stay) => (
              <li
                key={stay.id}
                className="rounded-2xl border border-stone-200 bg-white p-4"
              >
                <p className="text-xs text-stone-500">
                  {formatRange(stay.checkIn, stay.checkOut)}
                </p>
                <p className="text-lg font-medium">{stay.name}</p>
                {stay.address ? (
                  <p className="text-sm text-stone-600">{stay.address}</p>
                ) : null}
                {stay.confirmation ? (
                  <p className="text-sm text-stone-500">
                    Conf: {stay.confirmation}
                  </p>
                ) : null}
                {stay.bookingUrl ? (
                  <a
                    href={stay.bookingUrl}
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
        <AddStayForm />
      </main>
    </>
  );
}
