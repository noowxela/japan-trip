import { AddStayForm } from "@/components/add-stay-form";
import { EmptyState } from "@/components/empty-state";
import { ListAddSheet } from "@/components/list-add-sheet";
import { ListsSubNav } from "@/components/lists-sub-nav";
import {
  CompactRowList,
  PageHeader,
} from "@/components/compact";
import { PageShell } from "@/components/page-shell";
import { StayCard } from "@/components/stay-card";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { getStays } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function StaysPage() {
  const locale = await getLocale();
  const stays = await getStays();

  return (
    <>
      <PageShell>
        <PageHeader
          eyebrow={t(locale, "stays.eyebrow")}
          title={t(locale, "stays.title")}
          action={
            <ListAddSheet title={t(locale, "form.addStay")}>
              <AddStayForm embedded />
            </ListAddSheet>
          }
        />
        <ListsSubNav current="/stays" />
        {stays.length === 0 ? (
          <EmptyState title={t(locale, "stays.empty")}>
            {t(locale, "stays.emptyBody")}
          </EmptyState>
        ) : (
          <CompactRowList>
            {stays.map((stay) => (
              <li key={stay.id}>
                <StayCard stay={stay} />
              </li>
            ))}
          </CompactRowList>
        )}
      </PageShell>
    </>
  );
}
