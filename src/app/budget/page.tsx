import { AddSpendForm } from "@/components/add-spend-form";
import { EmptyState } from "@/components/empty-state";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";
import { formatRm, formatSpend } from "@/lib/format";
import { hasToken, isConfigured } from "@/lib/notion";
import { byCategory, moneySummary } from "@/lib/spend";
import { getDays, getSpend } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  if (!hasToken() || !isConfigured()) {
    return (
      <>
        <Nav current="/budget" />
        <PageShell>
          <EmptyState title="Notion is not ready">
            Add NOTION_TOKEN and run <code>npm run setup:notion</code> then{" "}
            <code>npm run migrate:v2</code>.
          </EmptyState>
        </PageShell>
      </>
    );
  }

  const [days, spend] = await Promise.all([getDays(), getSpend()]);
  const money = moneySummary(spend);
  const categories = byCategory(spend.filter((item) => item.kind === "Actual"));
  const dayNames = new Map(days.map((day) => [day.id, day.name]));
  const estimates = spend.filter((item) => item.kind === "Estimate");
  const actuals = spend.filter((item) => item.kind === "Actual");

  return (
    <>
      <Nav current="/budget" />
      <PageShell>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            Trip money
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Budget</h1>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center md:max-w-xl">
          <div className="rounded-2xl border border-stone-200 bg-white p-3">
            <p className="text-xs text-stone-500">Estimate</p>
            <p className="text-sm font-medium">{formatRm(money.estimate)}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-3">
            <p className="text-xs text-stone-500">Actual</p>
            <p className="text-sm font-medium">{formatRm(money.actual)}</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-3">
            <p className="text-xs text-stone-500">Left</p>
            <p className="text-sm font-medium">{formatRm(money.remaining)}</p>
          </div>
        </div>
        {categories.length > 0 ? (
          <ul className="max-w-xl space-y-1 text-sm text-stone-600">
            {categories.map(([category, amount]) => (
              <li key={category} className="flex justify-between">
                <span>{category}</span>
                <span>{formatRm(amount)}</span>
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
      </PageShell>
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
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4"
          >
            <div>
              <p className="font-medium break-words">{item.name}</p>
              <p className="text-xs text-stone-500">
                {[
                  item.category,
                  item.currency,
                  item.dayIds.map((id) => dayNames.get(id)).filter(Boolean).join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <p className="text-right text-sm font-medium whitespace-nowrap">
              {formatSpend(item.amount, item.currency)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
