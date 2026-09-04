import { CountdownWidget } from "@/components/countdown-widget";
import { EmptyState } from "@/components/empty-state";
import { FlightInfoList } from "@/components/flight-info-list";
import { Nav } from "@/components/nav";
import { eyebrowClass, PageShell } from "@/components/page-shell";
import { formatTripSpan, tokyoToday } from "@/lib/format";
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
  const tripStart = dated[0]?.date ?? null;
  const tripEnd = dated[dated.length - 1]?.date ?? null;
  const today = tokyoToday();
  const hops = tripFlow(days);
  const cityFlow = hops.length > 0 ? hops.join(" → ") : "";
  const span =
    dated.length > 0
      ? formatTripSpan(tripStart, tripEnd)
      : "Dates TBD";
  const flights = transit.filter((item) => item.mode === "Flight");
  const dayNames = new Map(days.map((day) => [day.id, day.name]));

  return (
    <>
      <Nav current="/" />
      <PageShell>
        <CountdownWidget start={tripStart} end={tripEnd} today={today} />

        <div>
          <p className={eyebrowClass}>
            Trip overview
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-stone-500">{span}</p>
          {cityFlow ? (
            <p className="mt-2 text-base font-medium">{cityFlow}</p>
          ) : null}
        </div>

        <FlightInfoList flights={flights} dayNames={dayNames} />
      </PageShell>
    </>
  );
}
