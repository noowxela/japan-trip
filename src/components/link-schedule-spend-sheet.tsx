"use client";

import { useMemo, useState, useTransition } from "react";
import { linkSpendToSchedule } from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { Modal } from "@/components/modal";
import { formatSpend } from "@/lib/format";
import { labelCategory } from "@/lib/i18n/dictionaries";
import { encodeScheduleLink, spendsForScheduleItem } from "@/lib/spend-link";
import type { AgendaItem, SpendItem } from "@/lib/types";

export function LinkScheduleSpendSheet({
  open,
  onClose,
  item,
  dayId,
  spends,
}: {
  open: boolean;
  onClose: () => void;
  item: AgendaItem | null;
  dayId: string;
  spends: SpendItem[];
}) {
  const { t, locale } = useT();
  const notify = useActionToast();
  const [busy, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const linkKind = item?.kind;
  const linkId = item?.id;
  const linkedIds = useMemo(() => {
    if (!linkKind || !linkId) return new Set<string>();
    return new Set(
      spendsForScheduleItem(spends, { kind: linkKind, id: linkId }).map(
        (row) => row.id,
      ),
    );
  }, [spends, linkKind, linkId]);

  const candidates = useMemo(() => {
    const sameDay = spends.filter((row) => row.dayIds.includes(dayId));
    const extra = spends.filter(
      (row) => linkedIds.has(row.id) && !row.dayIds.includes(dayId),
    );
    return [...extra, ...sameDay].sort((a, b) => a.name.localeCompare(b.name));
  }, [spends, dayId, linkedIds]);

  function toggle(spend: SpendItem) {
    if (!item) return;
    const linked = linkedIds.has(spend.id);
    const formData = new FormData();
    formData.set("id", spend.id);
    if (!linked) {
      const encoded = encodeScheduleLink(
        item.kind === "place" ? item.id : "",
        item.kind === "transit" ? item.id : "",
      );
      formData.set("scheduleLink", encoded);
    }
    setPendingId(spend.id);
    startTransition(async () => {
      await notify(await linkSpendToSchedule(formData));
      setPendingId(null);
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("agenda.linkSpend")}
    >
      {item ? (
        <div className="grid gap-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)]">
          <p className="text-[12px] text-ink-muted">{item.name}</p>
          {candidates.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("linkSpend.empty")}</p>
          ) : (
            candidates.map((spend) => {
              const linked = linkedIds.has(spend.id);
              return (
                <button
                  key={spend.id}
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(spend)}
                  className={`notebook-btn min-h-11 w-full px-4 py-3 text-left text-sm disabled:opacity-60 ${
                    linked
                      ? "bg-accent text-white"
                      : "border border-line bg-surface text-ink"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-medium">{spend.name}</span>
                      <span
                        className={`block text-[11px] ${
                          linked ? "text-white/80" : "text-ink-muted"
                        }`}
                      >
                        {[
                          formatSpend(spend.amount, spend.currency),
                          labelCategory(locale, spend.category),
                          linked ? t("action.spendLinked") : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    {pendingId === spend.id && busy ? "…" : null}
                  </span>
                </button>
              );
            })
          )}
          <button
            type="button"
            onClick={onClose}
            className="notebook-btn min-h-11 w-full px-4 py-3 text-center text-sm font-medium text-ink-muted"
          >
            {t("common.cancel")}
          </button>
        </div>
      ) : null}
    </Modal>
  );
}
