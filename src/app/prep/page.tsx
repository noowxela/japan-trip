import { PrepChecklist } from "@/components/prep-checklist";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/page-shell";
import { hasPrepDs, hasToken, isConfigured } from "@/lib/notion";
import { getPrep } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function PrepPage() {
  const notionReady = hasToken() && isConfigured();
  const prepReady = notionReady && hasPrepDs();
  const items = prepReady ? await getPrep() : [];

  return (
    <>
      <PageShell>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-moss">
            Before you go
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Prep list</h1>
          <p className="mt-1 text-sm text-stone-500">
            Packing and booking tasks shared in Notion.
          </p>
        </div>
        {prepReady ? (
          <PrepChecklist items={items} />
        ) : (
          <EmptyState title="Prep database is not ready">
            {notionReady
              ? "Run npm run migrate:v2 to create the Prep database, then restart the app."
              : "Connect Notion first, then run npm run migrate:v2."}
          </EmptyState>
        )}
      </PageShell>
    </>
  );
}
