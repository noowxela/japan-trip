import { AddDayForm } from "@/components/add-day-form";
import { Breadcrumb } from "@/components/breadcrumb";
import { DayCard } from "@/components/day-card";
import { EmptyState } from "@/components/empty-state";
import { ListAddSheet } from "@/components/list-add-sheet";
import { NotionNotReady } from "@/components/notion-not-ready";
import {
  CompactRowList,
  PageHeader,
} from "@/components/compact";
import { PageShell } from "@/components/page-shell";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { notionReady } from "@/lib/notion";
import { getDays } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function DaysPage() {
  if (!notionReady()) {
    return <NotionNotReady />;
  }

  const locale = await getLocale();
  const days = await getDays();

  return (
    <>
      <PageShell>
        <Breadcrumb
          items={[
            { href: "/settings", label: t(locale, "more.title") },
            { label: t(locale, "days.title") },
          ]}
        />
        <PageHeader
          eyebrow={t(locale, "days.eyebrow")}
          title={t(locale, "days.title")}
          action={
            <ListAddSheet title={t(locale, "days.add")}>
              <AddDayForm embedded />
            </ListAddSheet>
          }
        />
        {days.length === 0 ? (
          <EmptyState title={t(locale, "schedule.noDaysTitle")}>
            {t(locale, "days.emptyBody")}
          </EmptyState>
        ) : (
          <CompactRowList>
            {days.map((day) => (
              <li key={day.id} className="min-w-0">
                <DayCard day={day} />
              </li>
            ))}
          </CompactRowList>
        )}
      </PageShell>
    </>
  );
}
