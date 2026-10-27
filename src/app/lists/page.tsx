import { ListsSubNav } from "@/components/lists-sub-nav";
import { NotionNotReady } from "@/components/notion-not-ready";
import {
  CompactRow,
  CompactRowList,
  PageHeader,
} from "@/components/compact";
import { PageShell } from "@/components/page-shell";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { notionReady } from "@/lib/notion";
import { listCounts, getPlaces, getStays, getTransit } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function ListsPage() {
  if (!notionReady()) {
    return <NotionNotReady />;
  }

  const locale = await getLocale();
  const [places, stays, transit] = await Promise.all([
    getPlaces(),
    getStays(),
    getTransit(),
  ]);
  const counts = listCounts(places, stays, transit);
  const lists = [
    {
      href: "/places",
      label: t(locale, "places.title"),
      hint: t(locale, "lists.placesHint"),
      count: t(locale, "lists.placesCount", {
        n: counts.places,
        pending: counts.pending,
      }),
    },
    {
      href: "/stays",
      label: t(locale, "stays.title"),
      hint: t(locale, "lists.staysHint"),
      count: t(locale, "lists.staysCount", { n: counts.stays }),
    },
    {
      href: "/transit",
      label: t(locale, "transit.title"),
      hint: t(locale, "lists.transitHint"),
      count: t(locale, "lists.transitCount", { n: counts.transit }),
    },
  ];

  return (
    <>
      <PageShell>
        <PageHeader
          eyebrow={t(locale, "lists.eyebrow")}
          title={t(locale, "lists.title")}
        />
        <ListsSubNav current="/lists" />
        <CompactRowList>
          {lists.map((list) => (
            <li key={list.href}>
              <CompactRow
                href={list.href}
                title={list.label}
                meta={list.count}
                secondary={list.hint}
                trailing={
                  <span className="pr-2 text-[12px] text-ink-muted" aria-hidden>
                    ›
                  </span>
                }
              />
            </li>
          ))}
        </CompactRowList>
      </PageShell>
    </>
  );
}
