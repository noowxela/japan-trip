import { AddDayForm } from "@/components/add-day-form";
import { Breadcrumb } from "@/components/breadcrumb";
import { DayCard } from "@/components/day-card";
import { EmptyState } from "@/components/empty-state";
import { EditOnly } from "@/components/edit-session";
import { eyebrowClass, PageShell } from "@/components/page-shell";
import { hasToken, isConfigured } from "@/lib/notion";
import { getDays } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function DaysPage() {
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

  const days = await getDays();

  return (
    <>
      <PageShell>
        <Breadcrumb
          items={[
            { href: "/settings", label: "Settings" },
            { label: "Trip days" },
          ]}
        />
        <div>
          <p className={eyebrowClass}>
            Itinerary
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Trip days</h1>
        </div>
        {days.length === 0 ? (
          <EmptyState title="No days yet">
            Add your first day below, or in the Days database in Notion.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {days.map((day) => (
              <li key={day.id} className="min-w-0">
                <DayCard day={day} />
              </li>
            ))}
          </ul>
        )}
        <EditOnly>
          <AddDayForm />
        </EditOnly>
      </PageShell>
    </>
  );
}
