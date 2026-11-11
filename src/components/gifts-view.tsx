"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  ActionSheet,
  ActionSheetItem,
  ChipRow,
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
import { GiftsSkeleton } from "@/components/page-skeletons";
import { useQuickExpenseOptional } from "@/components/quick-expense-provider";
import { useToast } from "@/components/toast-provider";
import { formatSpend } from "@/lib/format";
import {
  EMPTY_GIFTS,
  GIFTS_CHANGED_EVENT,
  GIFTS_STORAGE_KEY,
  type GiftItem,
  type GiftTab,
  createGift,
  deleteGift,
  findSpendForGift,
  giftMoney,
  giftsForTab,
  invalidateGiftsMemory,
  linkGiftToSpend,
  readGifts,
  rememberRecipientNow,
  resolveLinkedSpend,
  spendsForGiftPicker,
  unlinkGiftFromSpend,
  upsertGift,
  writeGifts,
} from "@/lib/gifts";
import type { SpendCurrency, SpendItem } from "@/lib/types";
import { readTripCache, subscribeTripCache } from "@/lib/trip-cache";

function subscribeGifts(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === GIFTS_STORAGE_KEY) {
      invalidateGiftsMemory();
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(GIFTS_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(GIFTS_CHANGED_EVENT, onChange);
  };
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

type GiftDraft = {
  name: string;
  forSelf: boolean;
  recipient: string;
  amount: string;
  currency: SpendCurrency;
  notes: string;
  bought: boolean;
};

const emptyDraft = (): GiftDraft => ({
  name: "",
  forSelf: false,
  recipient: "",
  amount: "",
  currency: "Yen",
  notes: "",
  bought: false,
});

function draftFromGift(gift: GiftItem): GiftDraft {
  return {
    name: gift.name,
    forSelf: gift.forSelf,
    recipient: gift.recipient,
    amount: gift.amount != null ? String(gift.amount) : "",
    currency: gift.currency ?? "Yen",
    notes: gift.notes ?? "",
    bought: gift.bought,
  };
}

export function GiftsView({
  initialSpends,
}: {
  initialSpends: SpendItem[];
}) {
  const { t } = useT();
  const canEdit = useCanEdit();
  const { toast } = useToast();
  const quick = useQuickExpenseOptional();
  const hydrated = useHydrated();
  const gifts = useSyncExternalStore(
    subscribeGifts,
    readGifts,
    () => EMPTY_GIFTS,
  );
  const tripSnapshot = useSyncExternalStore(
    subscribeTripCache,
    readTripCache,
    () => null,
  );

  const spends = useMemo(() => {
    if (initialSpends.length > 0) return initialSpends;
    return tripSnapshot?.spend ?? [];
  }, [initialSpends, tripSnapshot]);

  const [tab, setTab] = useState<GiftTab>("others");
  const [menuGift, setMenuGift] = useState<GiftItem | null>(null);
  const [editing, setEditing] = useState<GiftItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<GiftDraft>(emptyDraft);
  const [deleteGiftItem, setDeleteGiftItem] = useState<GiftItem | null>(null);
  const [linkGiftItem, setLinkGiftItem] = useState<GiftItem | null>(null);

  const visible = giftsForTab(gifts, tab);
  const boughtCount = visible.filter((item) => item.bought).length;

  if (!hydrated) {
    return <GiftsSkeleton />;
  }

  function persist(next: GiftItem[]) {
    writeGifts(next);
  }

  function openAdd() {
    setEditing(null);
    setDraft({ ...emptyDraft(), forSelf: tab === "self" });
    setFormOpen(true);
  }

  function openEdit(gift: GiftItem) {
    setEditing(gift);
    setDraft(draftFromGift(gift));
    setFormOpen(true);
    setMenuGift(null);
  }

  function onSave(event: FormEvent) {
    event.preventDefault();
    if (!canEdit) return;
    const name = draft.name.trim();
    if (!name) return;
    const amountRaw = draft.amount.trim();
    const amount = amountRaw ? Number(amountRaw) : undefined;
    const parsedAmount =
      amount != null && Number.isFinite(amount) ? amount : undefined;
    const next = editing
      ? {
          ...editing,
          name,
          forSelf: draft.forSelf,
          recipient: draft.forSelf ? "" : draft.recipient.trim(),
          amount: parsedAmount,
          currency: parsedAmount != null ? draft.currency : undefined,
          notes: draft.notes.trim() || undefined,
          bought: draft.bought,
          updatedAt: new Date().toISOString(),
        }
      : createGift({
          name,
          forSelf: draft.forSelf,
          recipient: draft.recipient,
          amount: parsedAmount,
          currency: parsedAmount != null ? draft.currency : undefined,
          notes: draft.notes,
          bought: draft.bought,
        });
    persist(upsertGift(gifts, next));
    if (!draft.forSelf && draft.recipient.trim()) {
      rememberRecipientNow(draft.recipient);
    }
    setFormOpen(false);
    setEditing(null);
    setTab(next.forSelf ? "self" : "others");
  }

  function toggleBought(gift: GiftItem) {
    if (!canEdit) return;
    persist(
      upsertGift(gifts, {
        ...gift,
        bought: !gift.bought,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function confirmDelete() {
    if (!canEdit || !deleteGiftItem) return;
    const snapshot = gifts;
    persist(deleteGift(gifts, deleteGiftItem.id));
    setDeleteGiftItem(null);
    toast(t("common.deleted"), {
      actionLabel: t("common.undo"),
      onAction: () => {
        writeGifts(snapshot);
        toast(t("common.undone"));
      },
      durationMs: 6000,
    });
  }

  function unlink(gift: GiftItem) {
    if (!canEdit || !gift.spendId) return;
    persist(unlinkGiftFromSpend(gifts, gift.spendId));
    setMenuGift(null);
  }

  function linkToSpend(gift: GiftItem, spend: SpendItem) {
    if (!canEdit) return;
    persist(linkGiftToSpend(gifts, gift.id, spend));
    setLinkGiftItem(null);
  }

  function logExpense(gift?: GiftItem) {
    if (!quick) return;
    quick.openQuickExpense({
      category: "Shop",
      gift: gift
        ? {
            giftId: gift.id,
            flagged: true,
            forSelf: gift.forSelf,
            recipient: gift.recipient,
            name: gift.name,
            amount: gift.amount,
            currency: gift.currency,
          }
        : {
            flagged: true,
            forSelf: tab === "self",
          },
    });
  }

  const pickerSpends = linkGiftItem ? spendsForGiftPicker(spends) : [];

  return (
    <PageShell>
      <PageHeader
        eyebrow={t("gifts.eyebrow")}
        title={t("gifts.title")}
        action={
          canEdit ? (
            <button
              type="button"
              onClick={openAdd}
              className={compactBtnPrimaryClass}
            >
              {t("gifts.add")}
            </button>
          ) : null
        }
      />
      <p className="-mt-1 text-[12px] text-ink-muted">{t("gifts.subtitle")}</p>

      <ChipRow
        value={tab}
        onChange={setTab}
        label={t("gifts.title")}
        options={[
          { value: "others", label: t("gifts.tabOthers") },
          { value: "self", label: t("gifts.tabSelf") },
        ]}
      />

      <SummaryStrip>
        <span className="tabular-nums">
          {t("gifts.boughtCount", {
            bought: boughtCount,
            total: visible.length,
          })}
        </span>
      </SummaryStrip>

      {visible.length === 0 ? (
        <p className="px-1 text-[13px] text-ink-muted">
          {tab === "self" ? t("gifts.emptySelf") : t("gifts.emptyOthers")}
        </p>
      ) : (
        <CompactRowList>
          {visible.map((gift) => {
            const spend = findSpendForGift(gift, spends);
            const money = giftMoney(gift, spends);
            const linkedMissing = Boolean(gift.spendId && !spend);
            const secondaryBits = [
              gift.forSelf ? t("gifts.myself") : gift.recipient,
              money ? formatSpend(money.amount, money.currency) : null,
              spend ? spend.name : linkedMissing ? t("gifts.spendMissing") : null,
              gift.notes || null,
            ].filter(Boolean);
            return (
              <li key={gift.id}>
                <CompactRow
                  muted={!gift.bought}
                  leading={
                    <button
                      type="button"
                      disabled={!canEdit}
                      onClick={() => toggleBought(gift)}
                      aria-label={
                        gift.bought
                          ? t("gifts.markUnbought")
                          : t("gifts.markBought")
                      }
                      className="flex h-10 w-10 items-center justify-center disabled:opacity-60"
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          gift.bought
                            ? "border-ok bg-ok text-white"
                            : "border-line bg-surface"
                        }`}
                      >
                        {gift.bought ? (
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
                  title={gift.name}
                  secondary={secondaryBits.join(" · ")}
                  trailing={
                    canEdit ? (
                      <RowMoreButton
                        label={t("agenda.actionsFor", { name: gift.name })}
                        onClick={() => setMenuGift(gift)}
                      />
                    ) : null
                  }
                />
              </li>
            );
          })}
        </CompactRowList>
      )}

      {canEdit && quick ? (
        <button
          type="button"
          onClick={() => logExpense()}
          className={`${compactBtnGhostClass} self-start`}
        >
          {t("gifts.addSpend")}
        </button>
      ) : null}

      <ActionSheet
        open={menuGift != null}
        onClose={() => setMenuGift(null)}
        title={menuGift?.name ?? ""}
      >
        <ActionSheetItem
          onClick={() => menuGift && openEdit(menuGift)}
        >
          {t("common.edit")}
        </ActionSheetItem>
        {menuGift && resolveLinkedSpend(menuGift, spends) ? (
          <ActionSheetItem
            onClick={() => {
              const id = menuGift ? resolveLinkedSpend(menuGift, spends) : undefined;
              setMenuGift(null);
              if (id) window.location.assign(`/budget/${id}`);
            }}
          >
            {t("gifts.openSpend")}
          </ActionSheetItem>
        ) : (
          <ActionSheetItem
            onClick={() => {
              setLinkGiftItem(menuGift);
              setMenuGift(null);
            }}
          >
            {t("gifts.linkSpend")}
          </ActionSheetItem>
        )}
        {menuGift?.spendId ? (
          <ActionSheetItem onClick={() => menuGift && unlink(menuGift)}>
            {t("gifts.unlinkSpend")}
          </ActionSheetItem>
        ) : null}
        {quick && menuGift && !menuGift.spendId ? (
          <ActionSheetItem
            onClick={() => {
              const gift = menuGift;
              setMenuGift(null);
              if (gift) logExpense(gift);
            }}
          >
            {t("gifts.addSpend")}
          </ActionSheetItem>
        ) : null}
        <ActionSheetItem
          danger
          onClick={() => {
            setDeleteGiftItem(menuGift);
            setMenuGift(null);
          }}
        >
          {t("gifts.delete")}
        </ActionSheetItem>
        <ActionSheetItem onClick={() => setMenuGift(null)}>
          {t("common.cancel")}
        </ActionSheetItem>
      </ActionSheet>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t("gifts.edit") : t("gifts.add")}
      >
        <form onSubmit={onSave} className="grid gap-3">
          <label className="grid gap-1">
            <span className={compactLabelClass}>{t("gifts.name")}</span>
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              required
              autoFocus
              placeholder={t("gifts.namePlaceholder")}
              className={compactFieldClass}
            />
          </label>
          <div className="grid gap-1.5">
            <span className={compactLabelClass}>{t("gifts.whoFor")}</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={draft.forSelf}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    forSelf: true,
                    recipient: "",
                  }))
                }
                className={`notebook-btn inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium ${
                  draft.forSelf
                    ? "bg-ink text-surface"
                    : "border border-line bg-surface text-ink"
                }`}
              >
                {t("gifts.myself")}
              </button>
              <button
                type="button"
                aria-pressed={!draft.forSelf}
                onClick={() =>
                  setDraft((current) => ({ ...current, forSelf: false }))
                }
                className={`notebook-btn inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium ${
                  !draft.forSelf
                    ? "bg-ink text-surface"
                    : "border border-line bg-surface text-ink"
                }`}
              >
                {t("gifts.forOthers")}
              </button>
            </div>
            {!draft.forSelf ? (
              <input
                value={draft.recipient}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    recipient: event.target.value,
                  }))
                }
                placeholder={t("gifts.recipientPlaceholder")}
                className={compactFieldClass}
              />
            ) : null}
          </div>
          <label className="grid gap-1">
            <span className={compactLabelClass}>{t("gifts.amountOptional")}</span>
            <div className="flex gap-2">
              <input
                value={draft.amount}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                inputMode="decimal"
                className={`${compactFieldClass} flex-1`}
              />
              <div
                className="flex shrink-0 overflow-hidden rounded-lg border border-line"
                role="radiogroup"
                aria-label={t("form.currency")}
              >
                {(["Yen", "RM"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={draft.currency === option}
                    onClick={() =>
                      setDraft((current) => ({ ...current, currency: option }))
                    }
                    className={`h-9 px-2.5 text-[12px] font-medium ${
                      draft.currency === option
                        ? "bg-ink text-surface"
                        : "bg-surface text-ink"
                    }`}
                  >
                    {option === "Yen" ? "¥" : "RM"}
                  </button>
                ))}
              </div>
            </div>
          </label>
          <label className="grid gap-1">
            <span className={compactLabelClass}>{t("gifts.notes")}</span>
            <input
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
              }
              className={compactFieldClass}
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={draft.bought}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  bought: event.target.checked,
                }))
              }
              className="h-4 w-4 accent-accent"
            />
            {t("gifts.bought")}
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
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

      <Modal
        open={linkGiftItem != null}
        onClose={() => setLinkGiftItem(null)}
        title={t("gifts.pickSpend")}
      >
        {pickerSpends.length === 0 ? (
          <p className="text-[13px] text-ink-muted">{t("gifts.noSpends")}</p>
        ) : (
          <div className="grid gap-1">
            {pickerSpends.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => linkGiftItem && linkToSpend(linkGiftItem, item)}
                className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 text-left text-[13px]"
              >
                <span className="min-w-0 truncate font-medium text-ink">
                  {item.name}
                </span>
                <span className="shrink-0 tabular-nums text-ink-muted">
                  {formatSpend(item.amount, item.currency)}
                </span>
              </button>
            ))}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteGiftItem != null}
        title={t("gifts.deleteTitle")}
        message={t("gifts.deleteMessage", { name: deleteGiftItem?.name ?? "" })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteGiftItem(null)}
      />
    </PageShell>
  );
}

export function GiftsOfflineFallback() {
  return <GiftsView initialSpends={[]} />;
}
