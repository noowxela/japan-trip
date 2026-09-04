import { AddTransitForm } from "@/components/add-transit-form";
import { EmptyState } from "@/components/empty-state";
import { EditOnly } from "@/components/edit-session";
import { ListsSubNav } from "@/components/lists-sub-nav";
import { PageShell } from "@/components/page-shell";
import { TransitCard } from "@/components/transit-card";
import { getDays, getTransit } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function TransitPage() {
  const [days, transit] = await Promise.all([getDays(), getTransit()]);
  const dayNames = new Map(days.map((day) => [day.id, day.name]));

  return (
    <>
      <PageShell>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-moss">
            Moves
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Transit</h1>
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
        <EditOnly>
          <AddTransitForm days={days} />
        </EditOnly>
      </PageShell>
    </>
  );
}
