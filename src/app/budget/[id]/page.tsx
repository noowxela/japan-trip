import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { SpendCategoryIcon } from "@/components/spend-category-icon";
import { SpendForm } from "@/components/spend-form";
import { SpendAmounts } from "@/components/spend-item-card";
import { getEditorSession } from "@/lib/edit-session";
import { getMyrToJpy } from "@/lib/exchange";
import { formatDay, formatTime } from "@/lib/format";
import { hasToken, isConfigured } from "@/lib/notion";
import { spendWhen } from "@/lib/spend";
import { getDays, getEditorNames, getSpendItem } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasToken() || !isConfigured()) notFound();

  const { id } = await params;
  if (id === "new") redirect("/budget");
  const [item, days, editor, fx, people] = await Promise.all([
    getSpendItem(id),
    getDays(),
    getEditorSession(),
    getMyrToJpy(),
    getEditorNames(),
  ]);
  if (!item) notFound();

  const when = spendWhen(item, days);
  const dayName = days.find((day) => item.dayIds.includes(day.id))?.name;
  const time = formatTime(when);

  return (
    <PageShell className="pt-4">
      <div className="flex items-start gap-3">
        <SpendCategoryIcon category={item.category} />
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight break-words">
            {item.name}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {[item.category, item.paidBy, dayName, when ? formatDay(when) : null, time]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {editor.canEdit ? (
        <SpendForm item={item} days={days} people={people} />
      ) : (
        <div className="notebook-card flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-stone-500">
              Amount
            </p>
            {item.notes ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-stone-600">
                {item.notes}
              </p>
            ) : (
              <p className="mt-3 text-sm text-stone-500">No notes.</p>
            )}
          </div>
          <SpendAmounts
            item={item}
            displayYen={false}
            jpyPerRm={fx.jpyPerRm}
          />
        </div>
      )}
    </PageShell>
  );
}
