import { AddStayForm } from "@/components/add-stay-form";
import { EmptyState } from "@/components/empty-state";
import { ListsSubNav } from "@/components/lists-sub-nav";
import { PageShell } from "@/components/page-shell";
import { StayCard } from "@/components/stay-card";
import { getStays } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function StaysPage() {
  const stays = await getStays();

  return (
    <>
      <PageShell>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-moss">
            Lodging
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Stays</h1>
        </div>
        <ListsSubNav current="/stays" />
        {stays.length === 0 ? (
          <EmptyState title="No stays yet">
            Add a hotel below, or in the Stays database in Notion.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {stays.map((stay) => (
              <li key={stay.id}>
                <StayCard stay={stay} />
              </li>
            ))}
          </ul>
        )}
        <AddStayForm />
      </PageShell>
    </>
  );
}
