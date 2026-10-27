"use client";

import { restorePage, type RestoreEntity } from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { useT } from "@/components/i18n-provider";
import { useToast } from "@/components/toast-provider";
import type { ActionResult } from "@/lib/action-result";

/** After a successful trash delete, show toast with Undo → restorePage. */
export function useTrashUndo() {
  const { toast } = useToast();
  const notify = useActionToast();
  const { t } = useT();

  return async function trashWithUndo(
    result: ActionResult,
    id: string,
    entity: RestoreEntity,
  ): Promise<ActionResult> {
    if (!result.ok) {
      await notify(result);
      return result;
    }
    toast(result.message ?? t("common.deleted"), {
      actionLabel: t("common.undo"),
      onAction: () => {
        void restorePage(id, entity).then((restored) => {
          if (restored.ok) {
            toast(t("common.undone"));
          } else {
            toast(restored.error, "error");
          }
        });
      },
      durationMs: 6000,
    });
    return result;
  };
}
