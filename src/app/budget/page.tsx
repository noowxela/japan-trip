import { AddExpenseFab } from "@/components/add-spend-form";
import { EmptyState } from "@/components/empty-state";
import { ExpensesHero } from "@/components/expenses-hero";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";
import { SpendItemCard } from "@/components/spend-item-card";
import { getMyrToJpy, yenForMyr } from "@/lib/exchange";
import { hasToken, isConfigured } from "@/lib/notion";
import { byCategory, moneySummary } from "@/lib/spend";
import { getDays, getSpend } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
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

  const { day: defaultDayId = "" } = await searchParams;
  const [days, spend, fx] = await Promise.all([
    getDays(),
    getSpend(),
    getMyrToJpy(),
  ]);
  const money = moneySummary(spend, fx.jpyPerRm);
  const actuals = spend.filter((item) => item.kind === "Actual");
  const categories = byCategory(actuals, fx.jpyPerRm);
  const dayNames = new Map(days.map((day) => [day.id, day.name]));
  const tenMyrInYen = yenForMyr(10, fx.jpyPerRm);

  return (
    <>
      <Nav current="/budget" />
      <PageShell>
        <ExpensesHero
          spentRm={money.actual}
          jpyPerRm={fx.jpyPerRm}
          tenMyrInYen={tenMyrInYen}
          fxLive={fx.live}
          fxAsOf={fx.asOf}
          categories={categories}
        />

        {actuals.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {actuals.map((item) => (
              <li key={item.id}>
                <SpendItemCard item={item} dayNames={dayNames} days={days} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No expenses yet">
            Tap + to log what you spent.
          </EmptyState>
        )}
        <AddExpenseFab days={days} defaultDayId={defaultDayId} />
      </PageShell>
    </>
  );
}
