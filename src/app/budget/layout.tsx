import type { ReactNode } from "react";
import { AddExpenseFab } from "@/components/add-spend-form";
import { BudgetBoard } from "@/components/budget-board";
import { BudgetStack } from "@/components/budget-stack";
import { NotionNotReady } from "@/components/notion-not-ready";
import { PageShell } from "@/components/page-shell";
import { QuickExpenseTripSync } from "@/components/quick-expense-provider";
import { TripCacheSync } from "@/components/trip-cache-sync";
import { getMyrToJpy, yenForMyr } from "@/lib/exchange";
import { notionReady } from "@/lib/notion";
import { moneySummary } from "@/lib/spend";
import { makeTripSnapshot } from "@/lib/trip-cache";
import {
  getDays,
  getEditorNames,
  getPlaces,
  getPrep,
  getSpend,
  getStays,
  getTransit,
} from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function BudgetLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!notionReady()) {
    return (
      <>
        <NotionNotReady />
        {children}
      </>
    );
  }

  const [days, spend, places, transit, stays, prep, fx, people] =
    await Promise.all([
      getDays(),
      getSpend(),
      getPlaces(),
      getTransit(),
      getStays(),
      getPrep(),
      getMyrToJpy(),
      getEditorNames(),
    ]);
  const money = moneySummary(spend, fx.jpyPerRm);
  const actuals = spend.filter((item) => item.kind === "Actual");

  return (
    <>
      <TripCacheSync
        snapshot={makeTripSnapshot({
          days,
          places,
          transit,
          stays,
          spend,
          prep,
        })}
      />
      <QuickExpenseTripSync days={days} people={people} />
      <PageShell className="gap-3 py-4">
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
      <AddExpenseFab days={days} people={people} />
      {children}
    </>
  );
}
