import { PrepChecklist } from "@/components/prep-checklist";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/compact";
import { PageShell } from "@/components/page-shell";
import { TripCacheSync } from "@/components/trip-cache-sync";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { hasPrepDs, notionReady } from "@/lib/notion";
import { makeTripSnapshot } from "@/lib/trip-cache";
import {
  getDays,
  getPlaces,
  getPrep,
  getSpend,
  getStays,
  getTransit,
} from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function PrepPage() {
  const locale = await getLocale();
  const ready = notionReady();
  const prepReady = ready && hasPrepDs();
  const [days, places, transit, stays, spend, items] = ready
    ? await Promise.all([
        getDays(),
        getPlaces(),
        getTransit(),
        getStays(),
        getSpend(),
        prepReady ? getPrep() : Promise.resolve([]),
      ])
    : [[], [], [], [], [], []];

  return (
    <>
      {ready ? (
        <TripCacheSync
          snapshot={makeTripSnapshot({
            days,
            places,
            transit,
            stays,
            spend,
            prep: items,
          })}
        />
      ) : null}
      <PageShell>
        <PageHeader
          eyebrow={t(locale, "prep.eyebrow")}
          title={t(locale, "prep.listTitle")}
        />
        <p className="-mt-1 text-[12px] text-ink-muted">
          {t(locale, "prep.subtitle")}
        </p>
        {prepReady ? (
          <PrepChecklist items={items} />
        ) : (
          <EmptyState title={t(locale, "prep.notReady")}>
            {ready ? t(locale, "prep.migrate") : t(locale, "prep.connect")}
          </EmptyState>
        )}
      </PageShell>
    </>
  );
}
