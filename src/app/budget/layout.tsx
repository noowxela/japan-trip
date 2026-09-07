import type { ReactNode } from "react";
import { AddExpenseFab } from "@/components/add-spend-form";
import { BudgetBoard } from "@/components/budget-board";
import { BudgetStack } from "@/components/budget-stack";
import { EmptyState } from "@/components/empty-state";
import { EditOnly } from "@/components/edit-session";
import { PageShell } from "@/components/page-shell";
import { getMyrToJpy, yenForMyr } from "@/lib/exchange";
import { hasToken, isConfigured } from "@/lib/notion";
import { moneySummary } from "@/lib/spend";
import { getDays, getEditorNames, getSpend } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function BudgetLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!hasToken() || !isConfigured()) {
    return (
      <>
        <PageShell>
          <EmptyState title="Notion is not ready">
            Add NOTION_TOKEN and run <code>npm run setup:notion</code> then{" "}
            <code>npm run migrate:v2</code>.
          </EmptyState>
        </PageShell>
        {children}
      </>
    );
  }

  const [days, spend, fx, people] = await Promise.all([
    getDays(),
    getSpend(),
    getMyrToJpy(),
    getEditorNames(),
  ]);
  const money = moneySummary(spend, fx.jpyPerRm);
  const actuals = spend.filter((item) => item.kind === "Actual");

  return (
    <>
      <PageShell>
        <BudgetStack>
          <BudgetBoard
            actuals={actuals}
            days={days}
            spentRm={money.actual}
            estimateRm={money.estimate}
            jpyPerRm={fx.jpyPerRm}
            tenMyrInYen={yenForMyr(10, fx.jpyPerRm)}
            fxLive={fx.live}
            fxAsOf={fx.asOf}
          />
        </BudgetStack>
      </PageShell>
      <EditOnly>
        <AddExpenseFab days={days} people={people} />
      </EditOnly>
      {children}
    </>
  );
}
