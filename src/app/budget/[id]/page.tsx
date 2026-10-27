import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/compact";
import { PageShell } from "@/components/page-shell";
import { SpendCategoryIcon } from "@/components/spend-category-icon";
import { SpendForm } from "@/components/spend-form";
import { SpendAmounts } from "@/components/spend-item-card";
import { getEditorSession } from "@/lib/edit-session";
import { getMyrToJpy } from "@/lib/exchange";
import { formatDay, formatTime } from "@/lib/format";
import { labelCategory, t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { NotionNotReady } from "@/components/notion-not-ready";
import { notionReady } from "@/lib/notion";
import { spendWhen } from "@/lib/spend";
import { getDays, getEditorNames, getSpendItem } from "@/lib/trip";

export const dynamic = "force-dynamic";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!notionReady()) {
    return <NotionNotReady />;
  }

  const locale = await getLocale();
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
  const rows = [
    { label: t(locale, "form.category"), value: labelCategory(locale, item.category) },
    { label: t(locale, "form.paidBy"), value: item.paidBy || "—" },
    { label: t(locale, "form.day"), value: dayName || "—" },
    {
      label: t(locale, "form.date"),
      value: when ? formatDay(when, locale) : "—",
    },
    { label: t(locale, "form.time"), value: time || "—" },
  ];

  return (
    <PageShell className="pt-4">
      <div className="flex items-start gap-2.5">
        <SpendCategoryIcon category={item.category} />
        <div className="min-w-0 flex-1">
          <PageHeader title={item.name} />
          <p className="mt-0.5 truncate text-[12px] text-ink-muted">
            {[
              labelCategory(locale, item.category),
              item.paidBy,
              dayName,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {editor.canEdit ? (
        <SpendForm item={item} days={days} people={people} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line/80 bg-surface">
          <div className="flex min-h-9 items-center justify-between gap-3 border-b border-line/70 px-3">
            <p className="text-[12px] text-ink-muted">{t(locale, "form.amount")}</p>
            <SpendAmounts
              item={item}
              displayYen={false}
              jpyPerRm={fx.jpyPerRm}
            />
          </div>
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex min-h-9 items-center justify-between gap-3 border-b border-line/70 px-3 last:border-b-0"
            >
              <p className="shrink-0 text-[12px] text-ink-muted">{row.label}</p>
              <p className="min-w-0 truncate text-right text-[14px] text-ink">
                {row.value}
              </p>
            </div>
          ))}
          <div className="px-3 py-2.5">
            <p className="text-[12px] text-ink-muted">{t(locale, "form.notes")}</p>
            {item.notes ? (
              <p className="mt-1 whitespace-pre-wrap text-[14px] text-ink">
                {item.notes}
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-ink-muted">
                {t(locale, "budget.noNotes")}
              </p>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
