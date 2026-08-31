import { AddSpendForm } from "@/components/add-spend-form";
import { EmptyState } from "@/components/empty-state";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";
import { SpendItemCard } from "@/components/spend-item-card";
import { formatDualRmYen, formatRm } from "@/lib/format";
import { byCategory, moneySummary } from "@/lib/spend";
import { getDays, getSpend } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function SpendPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const { day: defaultDayId = "" } = await searchParams;
  const [days, spend] = await Promise.all([getDays(), getSpend()]);
  const money = moneySummary(spend);
  const categories = byCategory(spend.filter((item) => item.kind === "Actual"));
  const dayNames = new Map(days.map((day) => [day.id, day.name]));
  const estimates = spend.filter((item) => item.kind === "Estimate");
  const actuals = spend.filter((item) => item.kind === "Actual");

  return (
    <>
      <Nav current="/spend" />
      <PageShell>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            Budget
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Spend</h1>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 md:max-w-xl">
          <p className="text-xs uppercase tracking-wide text-stone-500">
            Remaining
          </p>
          <p className="mt-1 text-2xl font-medium">
            {formatDualRmYen(money.remaining)}
          </p>
          <div className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
            <p>Estimate: {formatDualRmYen(money.estimate)}</p>
            <p>Actual: {formatDualRmYen(money.actual)}</p>
          </div>
        </div>

        {categories.length > 0 ? (
          <ul className="max-w-xl space-y-1 text-sm text-stone-600">
            {categories.map(([category, amount]) => (
              <li key={category} className="flex justify-between gap-3">
                <span>{category}</span>
                <span>{formatRm(amount)}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <SpendGroup title="Estimates" items={estimates} dayNames={dayNames} days={days} />
        <SpendGroup title="Actuals" items={actuals} dayNames={dayNames} days={days} />
        {spend.length === 0 ? (
          <EmptyState title="No spend yet">
            Add estimates and actuals below, or in the Spend database in Notion.
          </EmptyState>
        ) : null}
        <AddSpendForm days={days} defaultDayId={defaultDayId} />
      </PageShell>
    </>
  );
}

function SpendGroup({
  title,
  items,
  dayNames,
  days,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getSpend>>;
  dayNames: Map<string, string>;
  days: Awaited<ReturnType<typeof getDays>>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
        {title}
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <SpendItemCard item={item} dayNames={dayNames} days={days} />
          </li>
        ))}
      </ul>
    </section>
  );
}
