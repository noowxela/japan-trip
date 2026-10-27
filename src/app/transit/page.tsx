import { AddTransitForm } from "@/components/add-transit-form";
import { EmptyState } from "@/components/empty-state";
import { ListAddSheet } from "@/components/list-add-sheet";
import { ListsSubNav } from "@/components/lists-sub-nav";
import {
  CompactRowList,
  PageHeader,
} from "@/components/compact";
import { PageShell } from "@/components/page-shell";
import { TransitCard } from "@/components/transit-card";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { getDays, getTransit } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function TransitPage() {
  const locale = await getLocale();
  const [days, transit] = await Promise.all([getDays(), getTransit()]);
  const dayNames = new Map(days.map((day) => [day.id, day.name]));

  return (
    <>
      <PageShell>
        <PageHeader
          eyebrow={t(locale, "transit.eyebrow")}
          title={t(locale, "transit.title")}
          action={
            <ListAddSheet title={t(locale, "form.addTransit")}>
              <AddTransitForm days={days} embedded />
            </ListAddSheet>
          }
        />
        <ListsSubNav current="/transit" />
        {transit.length === 0 ? (
          <EmptyState title={t(locale, "transit.empty")}>
            {t(locale, "transit.emptyBody")}
          </EmptyState>
        ) : (
          <CompactRowList>
            {transit.map((item) => (
              <li key={item.id}>
                <TransitCard item={item} dayNames={dayNames} days={days} />
              </li>
            ))}
          </CompactRowList>
        )}
      </PageShell>
    </>
  );
}
