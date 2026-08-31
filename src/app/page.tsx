import { CountdownWidget } from "@/components/countdown-widget";
import { EmptyState } from "@/components/empty-state";
import { FlightInfoList } from "@/components/flight-info-list";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";
import { tokyoToday } from "@/lib/format";
import { hasToken, isConfigured } from "@/lib/notion";
import { getDays, getTransit, tripFlow } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  if (!hasToken() || !isConfigured()) {
    return (
      <>
        <Nav current="/" />
        <PageShell>
          <EmptyState title="Notion is not ready">
            Add NOTION_TOKEN and run <code>npm run setup:notion</code> then{" "}
            <code>npm run migrate:v2</code>.
          </EmptyState>
        </PageShell>
      </>
    );
  }

  const [days, transit] = await Promise.all([getDays(), getTransit()]);
  const dated = days.filter((day) => day.date);
  const startDate = dated[0]?.date ?? null;
  const endDate = dated[dated.length - 1]?.date ?? null;
  const today = tokyoToday();
  const hops = tripFlow(days);
  const cityFlow = hops.length > 0 ? hops.join(" → ") : "";
  const flights = transit.filter((item) => item.mode === "Flight");
  const dayNames = new Map(days.map((day) => [day.id, day.name]));

  return (
    <>
      <Nav current="/" />
      <PageShell>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            Trip overview
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Overview</h1>
        </div>

        <CountdownWidget
          startDate={startDate}
          endDate={endDate}
          today={today}
          cityFlow={cityFlow}
        />

        <FlightInfoList flights={flights} dayNames={dayNames} />
      </PageShell>
    </>
  );
}
