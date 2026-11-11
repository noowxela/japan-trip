"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  ActionSheet,
  ActionSheetItem,
  CompactRow,
  CompactRowList,
  PageHeader,
  RowMoreButton,
  SummaryStrip,
  compactBtnGhostClass,
  compactBtnPrimaryClass,
  compactFieldClass,
  compactLabelClass,
} from "@/components/compact";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCanEdit } from "@/components/edit-session";
import { useT } from "@/components/i18n-provider";
import { Modal } from "@/components/modal";
import { PageShell } from "@/components/page-shell";
import { ClothesSkeleton } from "@/components/page-skeletons";
import { useToast } from "@/components/toast-provider";
import {
  CLOTHES_CHANGED_EVENT,
  CLOTHES_STORAGE_KEY,
  type ClothesItem,
  adjustClothesQty,
  clothesItemName,
  clothesSummary,
  createClothesItem,
  deleteClothesItem,
  invalidateClothesMemory,
  readClothes,
  renameClothesItem,
  seedClothesIfMissing,
  upsertClothesItem,
  writeClothes,
} from "@/lib/clothes";
import type { Locale } from "@/lib/i18n/dictionaries";

function subscribeClothes(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CLOTHES_STORAGE_KEY) {
      invalidateClothesMemory();
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CLOTHES_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CLOTHES_CHANGED_EVENT, onChange);
  };
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ClothesView() {
  const { t, locale } = useT();
  const canEdit = useCanEdit();
  const { toast } = useToast();
  const hydrated = useHydrated();
  const store = useSyncExternalStore(
    subscribeClothes,
    () => readClothes(locale as Locale),
    () => readClothes(locale as Locale),
  );

  useEffect(() => {
    seedClothesIfMissing(locale as Locale);
  }, [locale]);

  const items = store.items;
  const summary = clothesSummary(items);

  const [menuItem, setMenuItem] = useState<ClothesItem | null>(null);
  const [renameItem, setRenameItem] = useState<ClothesItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteItem, setDeleteItem] = useState<ClothesItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  if (!hydrated) {
    return <ClothesSkeleton />;
  }

  function persist(next: ClothesItem[]) {
    writeClothes(next);
  }

  function onAdjust(id: string, field: "needed" | "packed", delta: number) {
    if (!canEdit) return;
    persist(adjustClothesQty(items, id, field, delta));
  }

  function onAdd(event: FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    const name = newName.trim();
    if (!name) return;
    persist(upsertClothesItem(items, createClothesItem({ name })));
    setNewName("");
    setAdding(false);
  }

  function onRename(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || !renameItem) return;
    persist(renameClothesItem(items, renameItem.id, renameValue));
    setRenameItem(null);
  }

  function confirmDelete() {
    if (!canEdit || !deleteItem) return;
    const removed = deleteItem;
    const snapshot = items;
    persist(deleteClothesItem(items, removed.id));
    setDeleteItem(null);
    toast(t("common.deleted"), {
      actionLabel: t("common.undo"),
      onAction: () => {
        writeClothes(snapshot);
        toast(t("common.undone"));
      },
      durationMs: 6000,
    });
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("clothes.eyebrow")}
        title={t("clothes.title")}
        action={
          canEdit ? (
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setNewName("");
              }}
              className={compactBtnPrimaryClass}
            >
              {t("clothes.add")}
            </button>
          ) : null
        }
      />
      <p className="-mt-1 text-[12px] text-ink-muted">{t("clothes.subtitle")}</p>

      <SummaryStrip>
        <span className="font-medium">{t("clothes.progress")}</span>
        <span className="text-ink-muted"> · </span>
        <span className="tabular-nums">
          {t("clothes.summary", {
            packed: summary.packed,
            needed: summary.needed,
          })}
        </span>
      </SummaryStrip>

      {items.length === 0 ? (
        <p className="px-1 text-[13px] text-ink-muted">{t("clothes.empty")}</p>
      ) : (
        <CompactRowList>
          {items.map((item) => {
            const name = clothesItemName(item, locale as Locale);
            return (
              <li key={item.id}>
                <CompactRow
                  title={name}
                  secondary={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <QtyStepper
                        label={t("clothes.needed")}
                        value={item.needed}
                        disabled={!canEdit}
                        decLabel={t("clothes.decNeeded", { name })}
                        incLabel={t("clothes.incNeeded", { name })}
                        onChange={(delta) => onAdjust(item.id, "needed", delta)}
                      />
                      <QtyStepper
                        label={t("clothes.packed")}
                        value={item.packed}
                        disabled={!canEdit}
                        decLabel={t("clothes.decPacked", { name })}
                        incLabel={t("clothes.incPacked", { name })}
                        onChange={(delta) => onAdjust(item.id, "packed", delta)}
                      />
                    </span>
                  }
                  trailing={
                    canEdit ? (
                      <RowMoreButton
                        label={t("agenda.actionsFor", { name })}
                        onClick={() => setMenuItem(item)}
                      />
                    ) : null
                  }
                />
              </li>
            );
          })}
        </CompactRowList>
      )}

      <ActionSheet
        open={menuItem != null}
        onClose={() => setMenuItem(null)}
        title={menuItem ? clothesItemName(menuItem, locale as Locale) : ""}
      >
        <ActionSheetItem
          onClick={() => {
            if (!menuItem) return;
            setRenameValue(clothesItemName(menuItem, locale as Locale));
            setRenameItem(menuItem);
            setMenuItem(null);
          }}
        >
          {t("clothes.rename")}
        </ActionSheetItem>
        <ActionSheetItem
          danger
          onClick={() => {
            setDeleteItem(menuItem);
            setMenuItem(null);
          }}
        >
          {t("clothes.delete")}
        </ActionSheetItem>
        <ActionSheetItem onClick={() => setMenuItem(null)}>
          {t("common.cancel")}
        </ActionSheetItem>
      </ActionSheet>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title={t("clothes.add")}
      >
        <form onSubmit={onAdd} className="grid gap-3">
          <label className="grid gap-1">
            <span className={compactLabelClass}>{t("clothes.name")}</span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              required
              autoFocus
              placeholder={t("clothes.placeholder")}
              className={compactFieldClass}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className={compactBtnGhostClass}
            >
              {t("common.cancel")}
            </button>
            <button type="submit" className={compactBtnPrimaryClass}>
              {t("common.add")}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={renameItem != null}
        onClose={() => setRenameItem(null)}
        title={t("clothes.rename")}
      >
        <form onSubmit={onRename} className="grid gap-3">
          <label className="grid gap-1">
            <span className={compactLabelClass}>{t("clothes.name")}</span>
            <input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              required
              autoFocus
              className={compactFieldClass}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRenameItem(null)}
              className={compactBtnGhostClass}
            >
              {t("common.cancel")}
            </button>
            <button type="submit" className={compactBtnPrimaryClass}>
              {t("common.save")}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteItem != null}
        title={t("clothes.deleteTitle")}
        message={t("clothes.deleteMessage", {
          name: deleteItem
            ? clothesItemName(deleteItem, locale as Locale)
            : "",
        })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteItem(null)}
      />
    </PageShell>
  );
}

function QtyStepper({
  label,
  value,
  disabled,
  incLabel,
  decLabel,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  incLabel: string;
  decLabel: string;
  onChange: (delta: number) => void;
}) {
  const btn =
    "flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface text-[15px] leading-none text-ink disabled:opacity-40";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[11px] text-ink-muted">{label}</span>
      <span className="inline-flex items-center gap-0.5">
        <button
          type="button"
          aria-label={decLabel}
          disabled={disabled || value <= 0}
          onClick={() => onChange(-1)}
          className={btn}
        >
          −
        </button>
        <span className="min-w-[1.25rem] text-center text-[13px] tabular-nums text-ink">
          {value}
        </span>
        <button
          type="button"
          aria-label={incLabel}
          disabled={disabled}
          onClick={() => onChange(1)}
          className={btn}
        >
          +
        </button>
      </span>
    </span>
  );
}
