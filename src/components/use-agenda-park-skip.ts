"use client";

import { useRouter } from "next/navigation";
import { confirmPendingPlace, parkPlaceAsPending } from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { useOutbox } from "@/components/outbox-provider";
import { useToast } from "@/components/toast-provider";
import { formatTime } from "@/lib/format";
import { haptic } from "@/lib/haptic";
import type { ActionResult } from "@/lib/action-result";

export type ParkableItem = {
  id: string;
  start: string | null;
};

export type SkippableItem = {
  id: string;
  kind: "place" | "transit";
};

export function pendingMoveToastMessage(
  t: (key: string, vars?: Record<string, string | number>) => string,
  opts: { count: number; time?: string | null; transitLeft?: number },
) {
  const parts: string[] = [];
  if (opts.count === 1 && opts.time) {
    parts.push(t("action.movedToPendingWithTime", { time: opts.time }));
  } else if (opts.count === 1) {
    parts.push(t("action.movedToPending"));
  } else if (opts.count > 1) {
    parts.push(t("action.movedToPendingCount", { n: opts.count }));
  }
  if (opts.transitLeft && opts.transitLeft > 0) {
    parts.push(t("action.transitLeftUnchanged", { n: opts.transitLeft }));
  }
  return parts.join(" · ");
}

export function useAgendaParkAndSkip() {
  const router = useRouter();
  const notify = useActionToast();
  const { toast } = useToast();
  const { t } = useT();
  const { markSkipped } = useOutbox();

  async function parkPlaces(
    items: ParkableItem[],
    dayId: string,
    transitLeft = 0,
  ): Promise<string[]> {
    if (items.length === 0) {
      if (transitLeft > 0) {
        toast(t("action.transitLeftUnchanged", { n: transitLeft }));
      }
      return [];
    }

    haptic("success");
    const succeeded: ParkableItem[] = [];
    let lastError: ActionResult | null = null;
    for (const item of items) {
      const formData = new FormData();
      formData.set("id", item.id);
      formData.set("dayId", dayId);
      const result = await parkPlaceAsPending(formData);
      if (result.ok) succeeded.push(item);
      else lastError = result;
    }

    if (succeeded.length === 0) {
      if (lastError) await notify(lastError);
      return [];
    }

    const time =
      succeeded.length === 1 ? formatTime(succeeded[0].start) : null;
    toast(pendingMoveToastMessage(t, { count: succeeded.length, time, transitLeft }), {
      actionLabel: t("common.undo"),
      onAction: () => {
        void (async () => {
          for (const item of succeeded) {
            const undo = new FormData();
            undo.set("id", item.id);
            undo.set("dayId", dayId);
            if (item.start) undo.set("start", item.start);
            await confirmPendingPlace(undo);
          }
          router.refresh();
        })();
      },
      durationMs: 6000,
    });
    if (lastError) await notify(lastError);
    router.refresh();
    return succeeded.map((item) => item.id);
  }

  async function skipItems(items: SkippableItem[]): Promise<string[]> {
    if (items.length === 0) return [];
    haptic("success");
    const succeeded: SkippableItem[] = [];
    let lastError: ActionResult | null = null;
    for (const item of items) {
      const result = await markSkipped(item.id, true, item.kind, {
        silent: true,
      });
      if (result.ok) succeeded.push(item);
      else lastError = result;
    }

    if (succeeded.length === 0) {
      if (lastError) await notify(lastError);
      return [];
    }

    const message =
      succeeded.length === 1
        ? t("action.markedSkipped")
        : t("action.markedSkippedCount", { n: succeeded.length });
    toast(message, {
      actionLabel: t("common.undo"),
      onAction: () => {
        for (const item of succeeded) {
          void markSkipped(item.id, false, item.kind, { silent: true });
        }
      },
    });
    if (lastError) await notify(lastError);
    return succeeded.map((item) => item.id);
  }

  return { parkPlaces, skipItems };
}
