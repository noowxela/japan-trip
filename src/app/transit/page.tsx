import { AddTransitForm } from "@/components/add-transit-form";
import { EmptyState } from "@/components/empty-state";
import { ListsSubNav } from "@/components/lists-sub-nav";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";
import { TransitCard } from "@/components/transit-card";
import { getDays, getTransit } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function TransitPage() {
  const [days, transit] = await Promise.all([getDays(), getTransit()]);
  const dayNames = new Map(days.map((day) => [day.id, day.name]));

  return (
    <>
      <Nav current="/lists" />
      <PageShell>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            Moves
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Transit</h1>
        </div>
        <ListsSubNav current="/transit" />
        {transit.length === 0 ? (
          <EmptyState title="No transit yet">
            Add a train or flight below, or in the Transit database in Notion.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {transit.map((item) => (
              <li key={item.id}>
                <TransitCard item={item} dayNames={dayNames} days={days} />
              </li>
            ))}
          </ul>
        )}
        <AddTransitForm days={days} />
      </PageShell>
    </>
  );
}
