import { AddSpendForm } from "@/components/add-spend-form";
import { EmptyState } from "@/components/empty-state";
import { Nav } from "@/components/nav";
import { formatYen } from "@/lib/format";
import { byCategory, moneySummary } from "@/lib/spend";
import { getDays, getSpend } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function SpendPage() {
  const [days, spend] = await Promise.all([getDays(), getSpend()]);
  const money = moneySummary(spend);
  const categories = byCategory(spend.filter((item) => item.kind === "Actual"));
  const dayNames = new Map(days.map((day) => [day.id, day.name]));
  const estimates = spend.filter((item) => item.kind === "Estimate");
  const actuals = spend.filter((item) => item.kind === "Actual");

  return (
    <>
      <Nav current="/spend" />
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            Yen
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Spend</h1>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-stone-200 bg-white p-3">
            <p className="text-xs text-stone-500">Estimate</p>
            <p className="text-sm font-medium">{formatYen(money.estimate)}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-3">
            <p className="text-xs text-stone-500">Actual</p>
            <p className="text-sm font-medium">{formatYen(money.actual)}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-3">
            <p className="text-xs text-stone-500">Left</p>
            <p className="text-sm font-medium">{formatYen(money.remaining)}</p>
          </div>
        </div>
        {categories.length > 0 ? (
          <ul className="space-y-1 text-sm text-stone-600">
            {categories.map(([category, amount]) => (
              <li key={category} className="flex justify-between">
                <span>{category}</span>
                <span>{formatYen(amount)}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <SpendGroup title="Estimates" items={estimates} dayNames={dayNames} />
        <SpendGroup title="Actuals" items={actuals} dayNames={dayNames} />
        {spend.length === 0 ? (
          <EmptyState title="No spend yet">
            Add estimates and actuals below, or in the Spend database in Notion.
          </EmptyState>
        ) : null}
        <AddSpendForm days={days} />
      </main>
    </>
  );
}

function SpendGroup({
  title,
  items,
  dayNames,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getSpend>>;
  dayNames: Map<string, string>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
        {title}
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-stone-500">
                {[
                  item.category,
                  item.dayIds.map((id) => dayNames.get(id)).filter(Boolean).join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <p className="text-sm font-medium">{formatYen(item.amount)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
