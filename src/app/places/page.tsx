import { AddPlaceModal } from "@/components/add-place-modal";
import { EmptyState } from "@/components/empty-state";
import { ListsSubNav } from "@/components/lists-sub-nav";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";
import { PlacesList } from "@/components/places-list";
import { hasToken, isConfigured } from "@/lib/notion";
import { getDays, getPlaces } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  if (!hasToken() || !isConfigured()) {
    return (
      <>
        <Nav current="/lists" />
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
      <Nav current="/lists" />
      <PageShell>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
              Guide
            </p>
            <h1 className="font-serif text-3xl tracking-tight">Places</h1>
          </div>
          <AddPlaceModal days={days} />
        </div>
        <ListsSubNav current="/places" />
        <PlacesList places={places} days={days} />
      </PageShell>
    </>
  );
}
