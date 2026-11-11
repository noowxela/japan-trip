"use client";

import {
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  ActionSheet,
  ActionSheetItem,
  CompactRow,
  CompactRowList,
  RowMoreButton,
  compactBtnGhostClass,
  compactBtnPrimaryClass,
  compactFieldClass,
  compactLabelClass,
  compactTextareaClass,
} from "@/components/compact";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useCanEdit } from "@/components/edit-session";
import { useT } from "@/components/i18n-provider";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast-provider";
import {
  ESIM_CHANGED_EVENT,
  ESIM_STORAGE_KEY,
  type EsimPlan,
  createEsimPlan,
  deleteEsimPlan,
  esimExpiryStatus,
  invalidateEsimMemory,
  readEsim,
  upsertEsimPlan,
  writeEsim,
} from "@/lib/esim";
import { formatDay, tokyoToday } from "@/lib/format";
import type { Locale } from "@/lib/i18n/dictionaries";

const EMPTY_ESIM_PLANS: EsimPlan[] = [];

function subscribeEsim(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === ESIM_STORAGE_KEY) {
      invalidateEsimMemory();
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(ESIM_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ESIM_CHANGED_EVENT, onChange);
  };
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type PlanDraft = {
  name: string;
  dataAllowance: string;
  expiryDate: string;
  notes: string;
};

const EMPTY_DRAFT: PlanDraft = {
  name: "",
  dataAllowance: "",
  expiryDate: "",
  notes: "",
};

function draftFromPlan(plan: EsimPlan): PlanDraft {
  return {
    name: plan.name,
    dataAllowance: plan.dataAllowance,
    expiryDate: plan.expiryDate ?? "",
    notes: plan.notes,
  };
}

function expiryLine(
  plan: EsimPlan,
  today: string,
  locale: Locale,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  const status = esimExpiryStatus(plan.expiryDate, today);
  if (status === "expired") return t("esim.expired");
  if (status === "valid" && plan.expiryDate) {
    if (plan.expiryDate === today) return t("esim.expiresToday");
    return t("esim.validUntil", { date: formatDay(plan.expiryDate, locale) });
  }
  return t("esim.noExpiry");
}

export function EsimSection() {
  const { t, locale } = useT();
  const canEdit = useCanEdit();
  const { toast } = useToast();
  const hydrated = useHydrated();
  const plans = useSyncExternalStore(subscribeEsim, readEsim, () => EMPTY_ESIM_PLANS);
  const today = tokyoToday();

  const [menuPlan, setMenuPlan] = useState<EsimPlan | null>(null);
  const [editing, setEditing] = useState<EsimPlan | "new" | null>(null);
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT);
  const [deletePlan, setDeletePlan] = useState<EsimPlan | null>(null);

  function persist(next: EsimPlan[]) {
    writeEsim(next);
  }

  function openNew() {
    if (!canEdit) return;
    setDraft(EMPTY_DRAFT);
    setEditing("new");
  }

  function openEdit(plan: EsimPlan) {
    if (!canEdit) return;
    setDraft(draftFromPlan(plan));
    setEditing(plan);
  }

  function onSave(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || editing == null) return;
    const name = draft.name.trim();
    if (!name) return;
    const base =
      editing === "new"
        ? createEsimPlan({
            name,
            dataAllowance: draft.dataAllowance,
            expiryDate: draft.expiryDate || null,
            notes: draft.notes,
          })
        : {
            ...editing,
            name,
            dataAllowance: draft.dataAllowance,
            expiryDate: draft.expiryDate || null,
            notes: draft.notes,
          };
    persist(upsertEsimPlan(plans, base));
    setEditing(null);
  }

  function confirmDelete() {
    if (!canEdit || !deletePlan) return;
    const snapshot = plans;
    persist(deleteEsimPlan(plans, deletePlan.id));
    setDeletePlan(null);
    toast(t("common.deleted"), {
      actionLabel: t("common.undo"),
      onAction: () => {
        writeEsim(snapshot);
        toast(t("common.undone"));
      },
      durationMs: 6000,
    });
  }

  const formOpen = editing != null;

  return (
    <section className="space-y-2" aria-label={t("esim.title")}>
      <div className="flex h-7 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[12px] font-medium text-ink-muted">
          {t("esim.title")}
        </p>
        {canEdit && hydrated ? (
          <button
            type="button"
            onClick={openNew}
            className={compactBtnPrimaryClass}
          >
            {t("esim.add")}
          </button>
        ) : null}
      </div>

      {!hydrated ? (
        <div className="h-11 rounded-xl border border-line bg-surface" aria-hidden />
      ) : plans.length === 0 ? (
        <p className="px-1 text-[13px] text-ink-muted">{t("esim.empty")}</p>
      ) : (
        <CompactRowList>
          {plans.map((plan) => {
            const status = esimExpiryStatus(plan.expiryDate, today);
            const metaParts = [
              plan.dataAllowance || null,
              expiryLine(plan, today, locale as Locale, t),
              plan.notes || null,
            ].filter(Boolean);
            return (
              <li key={plan.id}>
                <CompactRow
                  title={plan.name}
                  secondary={
                    <span className={status === "expired" ? "text-accent" : undefined}>
                      {metaParts.join(" · ")}
                    </span>
                  }
                  trailing={
                    canEdit ? (
                      <RowMoreButton
                        label={t("agenda.actionsFor", { name: plan.name })}
                        onClick={() => setMenuPlan(plan)}
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
        open={menuPlan != null}
        onClose={() => setMenuPlan(null)}
        title={menuPlan?.name ?? ""}
      >
        <ActionSheetItem
          onClick={() => {
            if (!menuPlan) return;
            openEdit(menuPlan);
            setMenuPlan(null);
          }}
        >
          {t("esim.edit")}
        </ActionSheetItem>
        <ActionSheetItem
          danger
          onClick={() => {
            setDeletePlan(menuPlan);
            setMenuPlan(null);
          }}
        >
          {t("esim.delete")}
        </ActionSheetItem>
        <ActionSheetItem onClick={() => setMenuPlan(null)}>
          {t("common.cancel")}
        </ActionSheetItem>
      </ActionSheet>

      <Modal
        open={formOpen}
        onClose={() => setEditing(null)}
        title={editing === "new" ? t("esim.add") : t("esim.edit")}
      >
        <form onSubmit={onSave} className="grid gap-3">
          <label className="grid gap-1">
            <span className={compactLabelClass}>{t("esim.name")}</span>
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              required
              autoFocus
              placeholder={t("esim.namePlaceholder")}
              className={compactFieldClass}
            />
          </label>
          <label className="grid gap-1">
            <span className={compactLabelClass}>{t("esim.data")}</span>
            <input
              value={draft.dataAllowance}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  dataAllowance: event.target.value,
                }))
              }
              placeholder={t("esim.dataPlaceholder")}
              className={compactFieldClass}
            />
          </label>
          <label className="grid gap-1">
            <span className={compactLabelClass}>{t("esim.expiry")}</span>
            <input
              type="date"
              value={draft.expiryDate}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  expiryDate: event.target.value,
                }))
              }
              className={compactFieldClass}
            />
          </label>
          <label className="grid gap-1">
            <span className={compactLabelClass}>{t("esim.notes")}</span>
            <textarea
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              rows={3}
              placeholder={t("esim.notesPlaceholder")}
              className={compactTextareaClass}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className={compactBtnGhostClass}
            >
              {t("common.cancel")}
            </button>
            <button type="submit" className={compactBtnPrimaryClass}>
              {editing === "new" ? t("common.add") : t("common.save")}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deletePlan != null}
        title={t("esim.deleteTitle")}
        message={t("esim.deleteMessage", { name: deletePlan?.name ?? "" })}
        onConfirm={confirmDelete}
        onCancel={() => setDeletePlan(null)}
      />
    </section>
  );
}
