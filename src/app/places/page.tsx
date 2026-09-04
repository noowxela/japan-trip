import { AddPlaceModal } from "@/components/add-place-modal";
import { EmptyState } from "@/components/empty-state";
import { EditOnly } from "@/components/edit-session";
import { ListsSubNav } from "@/components/lists-sub-nav";
import { eyebrowClass, PageShell } from "@/components/page-shell";
import { PlacesList } from "@/components/places-list";
import { hasToken, isConfigured } from "@/lib/notion";
import { getDays, getPlaces } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  if (!hasToken() || !isConfigured()) {
    return (
      <>
        <PageShell>
          <EmptyState title="Notion is not ready">
            Add NOTION_TOKEN and run <code>npm run setup:notion</code> then{" "}
            <code>npm run migrate:v2</code>.
          </EmptyState>
        </PageShell>
      </>
    );
  }

  const [days, places] = await Promise.all([getDays(), getPlaces()]);

  return (
    <>
      <PageShell>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className={eyebrowClass}>
              Guide
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Places</h1>
          </div>
          <EditOnly>
            <AddPlaceModal days={days} />
          </EditOnly>
        </div>
        <ListsSubNav current="/places" />
        <PlacesList places={places} days={days} />
      </PageShell>
    </>
  );
}
