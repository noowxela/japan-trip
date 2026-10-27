import { AddPlaceModal } from "@/components/add-place-modal";
import { ListsSubNav } from "@/components/lists-sub-nav";
import { PageHeader } from "@/components/compact";
import { PageShell } from "@/components/page-shell";
import { NotionNotReady } from "@/components/notion-not-ready";
import { PlacesList } from "@/components/places-list";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { notionReady } from "@/lib/notion";
import { getDays, getPlaces } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  if (!notionReady()) {
    return <NotionNotReady />;
  }

  const locale = await getLocale();
  const [days, places] = await Promise.all([getDays(), getPlaces()]);

  return (
    <>
      <PageShell>
        <PageHeader
          eyebrow={t(locale, "places.eyebrow")}
          title={t(locale, "places.title")}
          action={<AddPlaceModal days={days} />}
        />
        <ListsSubNav current="/places" />
        <PlacesList places={places} days={days} />
      </PageShell>
    </>
  );
}
