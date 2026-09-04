import { AddDayForm } from "@/components/add-day-form";
import { Breadcrumb } from "@/components/breadcrumb";
import { DayCard } from "@/components/day-card";
import { EmptyState } from "@/components/empty-state";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";
import { hasToken, isConfigured } from "@/lib/notion";
import { getDays } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function DaysPage() {
  if (!hasToken() || !isConfigured()) {
    return (
      <>
        <Nav current="/settings" />
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
      <Nav current="/settings" />
      <PageShell>
        <Breadcrumb
          items={[
            { href: "/settings", label: "Settings" },
            { label: "Trip days" },
          ]}
        />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            Itinerary
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Trip days</h1>
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
        <AddDayForm />
      </PageShell>
    </>
  );
}
