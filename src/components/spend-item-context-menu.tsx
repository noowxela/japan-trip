"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { deleteSpend, updateSpend } from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { ChipGroup } from "@/components/chip-group";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DatePicker } from "@/components/date-picker";
import { useT } from "@/components/i18n-provider";
import { useOutbox } from "@/components/outbox-provider";
import { useTrashUndo } from "@/components/use-trash-undo";
import { useEditOrUnlock } from "@/components/unlock-provider";
import { dateKey } from "@/lib/format";
import { labelCategory } from "@/lib/i18n/dictionaries";
import {
  dateForSpendItem,
  formDataForDuplicateSpend,
  formDataFromSpendItem,
  isBeforeTripDate,
} from "@/lib/spend-item-form";
import { placeSpendContextMenu } from "@/lib/spend-item-menu";
import { SPEND_CATEGORIES, type SpendItem, type TripDay } from "@/lib/types";

type Panel = "actions" | "category" | "day";

const MENU_ESTIMATE = 200;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const ANIM_MS = 180;

export function SpendItemContextMenu({
  item,
  days,
  open,
  anchor,
  preview,
  onClose,
}: {
  item: SpendItem;
  days: TripDay[];
  open: boolean;
  anchor: { top: number; left: number; width: number; height: number } | null;
  preview: ReactNode;
  onClose: () => void;
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const notify = useActionToast();
  const trashWithUndo = useTrashUndo();
  const { submitSpend } = useOutbox();
  const editOrUnlock = useEditOrUnlock();
  const [busy, startTransition] = useTransition();
  const [panel, setPanel] = useState<Panel>("actions");
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(open);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuHeight, setMenuHeight] = useState(MENU_ESTIMATE);
  const [prevOpen, setPrevOpen] = useState(open);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const currentDate = dateForSpendItem(item, days);
  const itemIsBeforeTrip = isBeforeTripDate(currentDate, days);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
      setPanel("actions");
      setConfirmDelete(false);
      setShown(false);
    } else {
      setShown(false);
    }
  }

  useEffect(() => {
    if (open) {
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setShown(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => setMounted(false), ANIM_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (confirmDelete) setConfirmDelete(false);
        else onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [mounted, onClose, confirmDelete]);

  useLayoutEffect(() => {
    if (!mounted) return;
    const node = menuRef.current;
    if (!node) return;
    const height = node.getBoundingClientRect().height;
    if (height > 0 && Math.abs(height - menuHeight) > 1) {
      setMenuHeight(height);
    }
  }, [mounted, panel, menuHeight]);

  const viewport = useViewport();
  const layout = useMemo(() => {
    if (!anchor) return null;
    return placeSpendContextMenu({
      anchor,
      menuHeight,
      viewport,
    });
  }, [anchor, menuHeight, viewport]);

  const tripDates = useMemo(() => {
    const dates = new Set<string>();
    for (const day of days) {
      const key = dateKey(day.date);
      if (key) dates.add(key);
    }
    return dates;
  }, [days]);

  function ifEditable(fn: () => void) {
    let ran = false;
    editOrUnlock(() => {
      ran = true;
      fn();
    });
    if (!ran) onClose();
  }

  function applyUpdate(overrides: Parameters<typeof formDataFromSpendItem>[2]) {
    ifEditable(() => {
      const formData = formDataFromSpendItem(item, days, overrides);
      startTransition(async () => {
        const result = await updateSpend(formData);
        await notify(result);
        if (result.ok) {
          onClose();
          router.refresh();
        }
      });
    });
  }

  function applyDuplicate() {
    ifEditable(() => {
      const formData = formDataForDuplicateSpend(item, days);
      startTransition(async () => {
        const result = await submitSpend(formData);
        await notify(result);
        if (result.ok) onClose();
      });
    });
  }

  function applyDelete() {
    ifEditable(() => setConfirmDelete(true));
  }

  function confirmRemoval() {
    const formData = new FormData();
    formData.set("id", item.id);
    startTransition(async () => {
      const result = await trashWithUndo(
        await deleteSpend(formData),
        item.id,
        "spend",
      );
      if (!result.ok) return;
      setConfirmDelete(false);
      onClose();
      router.refresh();
    });
  }

  const confirm = (
    <ConfirmDialog
      open={confirmDelete}
      title={t("budget.deleteTitle")}
      message={t("budget.deleteMessage", { name: item.name })}
      confirmLabel={t("budget.delete")}
      busy={busy}
      onConfirm={confirmRemoval}
      onCancel={() => setConfirmDelete(false)}
    />
  );

  if ((!open && !mounted) || typeof document === "undefined" || !layout) {
    return confirm;
  }

  const actionClass =
    "flex min-h-11 w-full items-center px-4 text-left text-[15px] font-medium text-ink disabled:opacity-60";

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[200]"
        role="presentation"
        style={{
          opacity: shown ? 1 : 0,
          transition: `opacity ${ANIM_MS}ms ${EASE}`,
        }}
      >
        <button
          type="button"
          aria-label={t("common.close")}
          className="absolute inset-0 bg-ink/40 backdrop-blur-md"
          onClick={onClose}
        />
        <div
          className="pointer-events-none absolute overflow-hidden rounded-2xl bg-surface shadow-[0_12px_40px_rgba(28,25,23,0.22)]"
          style={{
            top: layout.preview.top,
            left: layout.preview.left,
            width: layout.preview.width,
            transform: shown ? `scale(${layout.scale})` : "scale(1)",
            transformOrigin: "top center",
            transition: `transform ${ANIM_MS}ms ${EASE}`,
          }}
        >
          <div className="pointer-events-none px-3 py-2">{preview}</div>
        </div>
        <div
          ref={menuRef}
          role="menu"
          aria-label={item.name}
          className="absolute overflow-hidden rounded-[14px] bg-surface/90 shadow-[0_12px_40px_rgba(28,25,23,0.22)] backdrop-blur-xl"
          style={{
            top: layout.menu.top,
            left: layout.menu.left,
            width: layout.menu.width,
            transform: shown
              ? "translate3d(0,0,0) scale(1)"
              : `translate3d(0,${layout.menu.placement === "below" ? "8px" : "-8px"},0) scale(0.96)`,
            transformOrigin:
              layout.menu.placement === "below" ? "top center" : "bottom center",
            transition: `opacity ${ANIM_MS}ms ${EASE}, transform ${ANIM_MS}ms ${EASE}`,
            opacity: shown ? 1 : 0,
          }}
        >
          {panel === "actions" ? (
            <div className="flex flex-col divide-y divide-line/70">
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                className={actionClass}
                onClick={() => ifEditable(() => setPanel("category"))}
              >
                {t("budget.changeCategory")}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                className={actionClass}
                onClick={() => ifEditable(() => setPanel("day"))}
              >
                {t("budget.moveToDay")}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                className={actionClass}
                onClick={applyDuplicate}
              >
                {t("budget.duplicate")}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                className={`${actionClass} text-accent`}
                onClick={applyDelete}
              >
                {t("budget.delete")}
              </button>
            </div>
          ) : null}
          {panel === "category" ? (
            <div className="p-3">
              <ChipGroup
                label={t("budget.chooseCategory")}
                value={
                  SPEND_CATEGORIES.includes(
                    item.category as (typeof SPEND_CATEGORIES)[number],
                  )
                    ? (item.category as (typeof SPEND_CATEGORIES)[number])
                    : "Food"
                }
                onChange={(next) => {
                  if (next === item.category) {
                    onClose();
                    return;
                  }
                  applyUpdate({ category: next });
                }}
                options={SPEND_CATEGORIES.map((value) => ({
                  value,
                  label: labelCategory(locale, value) ?? value,
                }))}
              />
            </div>
          ) : null}
          {panel === "day" ? (
            <div className="grid gap-2 p-3">
              <p className="text-xs font-medium text-ink-muted">
                {t("budget.chooseDay")}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (itemIsBeforeTrip) {
                    onClose();
                    return;
                  }
                  applyUpdate({ dayDate: "" });
                }}
                className={`notebook-btn inline-flex min-h-11 items-center justify-center px-3 text-sm font-medium ${
                  itemIsBeforeTrip
                    ? "bg-accent text-white"
                    : "border border-line bg-surface text-ink"
                }`}
              >
                {t("budget.beforeTrip")}
              </button>
              <DatePicker
                name="dayDate"
                value={currentDate}
                onChange={(next) => {
                  if (next === currentDate) {
                    onClose();
                    return;
                  }
                  applyUpdate({ dayDate: next });
                }}
                tripDates={tripDates}
                label={null}
                overlayClassName="fixed inset-0 z-[220]"
              />
            </div>
          ) : null}
        </div>
      </div>
      {confirm}
    </>,
    document.body,
  );
}

function useViewport() {
  const [viewport, setViewport] = useState(() =>
    typeof window === "undefined"
      ? { width: 390, height: 844 }
      : { width: window.innerWidth, height: window.innerHeight },
  );
  useEffect(() => {
    function sync() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  return viewport;
}
