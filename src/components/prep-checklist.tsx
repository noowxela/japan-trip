"use client";

import { useState, useTransition } from "react";
import { addPrepItem, deletePrepItem } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import {
  ActionSheet,
  ActionSheetItem,
  CompactRow,
  CompactRowList,
  compactFieldClass,
  RowMoreButton,
  SummaryStrip,
} from "@/components/compact";
import { useCanEdit } from "@/components/edit-session";
import { useT } from "@/components/i18n-provider";
import { useOutbox } from "@/components/outbox-provider";
import { useTrashUndo } from "@/components/use-trash-undo";
import type { PrepItem } from "@/lib/types";

export function PrepChecklist({ items }: { items: PrepItem[] }) {
  const canEdit = useCanEdit();
  const { t } = useT();
  const { prepOverlay } = useOutbox();
  const [formKey, setFormKey] = useState(0);
  const effectiveItems = items.map((item) =>
    prepOverlay[item.id] == null
      ? item
      : { ...item, done: prepOverlay[item.id] },
  );
  const doneCount = effectiveItems.filter((item) => item.done).length;
  const nextOrder =
    items.reduce((max, item) => Math.max(max, item.order ?? 0), 0) + 1;
  const pct =
    items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100);

  return (
    <div className="space-y-2.5">
      <SummaryStrip
        footer={
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full rounded-full bg-ok transition-[width]"
              style={{ width: `${pct}%` }}
              aria-hidden
            />
          </div>
        }
      >
        <span className="font-medium">{t("prep.progress")}</span>
        <span className="text-ink-muted"> · </span>
        <span className="tabular-nums">
          {t("prep.doneCount", { done: doneCount, total: items.length })}
        </span>
      </SummaryStrip>

      {effectiveItems.length === 0 ? (
        <p className="px-1 text-[13px] text-ink-muted">{t("prep.emptyBody")}</p>
      ) : (
        <CompactRowList>
          {effectiveItems.map((item) => (
            <li key={item.id}>
              <PrepRow item={item} canEdit={canEdit} />
            </li>
          ))}
        </CompactRowList>
      )}

      {canEdit ? (
        <ActionForm
          key={formKey}
          action={addPrepItem}
          className="flex min-w-0 items-center gap-2 rounded-xl border border-line bg-surface px-2 py-1.5"
          onSuccess={() => setFormKey((value) => value + 1)}
        >
          <input type="hidden" name="order" value={nextOrder} />
          <input
            name="name"
            required
            placeholder={t("prep.placeholder")}
            className={`min-w-0 flex-1 border-0 bg-transparent ${compactFieldClass} h-8 px-1`}
          />
          <button
            type="submit"
            className="shrink-0 notebook-btn h-8 rounded-lg bg-accent px-3 text-[12px] font-medium text-white"
          >
            {t("common.add")}
          </button>
        </ActionForm>
      ) : null}
    </div>
  );
}

function PrepRow({ item, canEdit }: { item: PrepItem; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const trashWithUndo = useTrashUndo();
  const { t } = useT();
  const { markPrep } = useOutbox();

  return (
    <>
      <CompactRow
        muted={item.done}
        leading={
          <button
            type="button"
            disabled={!canEdit || pending}
            onClick={() => {
              if (!canEdit) return;
              startTransition(async () => {
                await markPrep(item.id, !item.done);
              });
            }}
            aria-label={
              item.done ? t("prep.markIncomplete") : t("prep.markComplete")
            }
            className="flex h-10 w-10 items-center justify-center disabled:opacity-60"
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                item.done
                  ? "border-ok bg-ok text-white"
                  : "border-line bg-surface"
              }`}
            >
              {item.done ? (
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  className="h-2.5 w-2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
              ) : null}
            </span>
          </button>
        }
        title={item.name}
        trailing={
          canEdit ? (
            <RowMoreButton
              label={t("agenda.actionsFor", { name: item.name })}
              onClick={() => setMenuOpen(true)}
            />
          ) : null
        }
      />
      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={item.name}
      >
        <ActionSheetItem
          danger
          disabled={pending}
          onClick={() => {
            const formData = new FormData();
            formData.set("id", item.id);
            setMenuOpen(false);
            startTransition(async () => {
              await trashWithUndo(
                await deletePrepItem(formData),
                item.id,
                "prep",
              );
            });
          }}
        >
          {t("prep.remove")}
        </ActionSheetItem>
        <ActionSheetItem onClick={() => setMenuOpen(false)}>
          {t("common.cancel")}
        </ActionSheetItem>
      </ActionSheet>
    </>
  );
}
