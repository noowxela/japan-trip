"use client";

import { useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/lib/action-result";
import { useT } from "@/components/i18n-provider";
import { useToast } from "@/components/toast-provider";
import { hapticError, hapticSuccess, shouldUseIosOverlays } from "@/lib/haptic";

export function useActionToast() {
  const { toast } = useToast();

  return async (result: ActionResult) => {
    if (result.ok) {
      hapticSuccess();
      if (result.message) toast(result.message);
    } else {
      hapticError();
      toast(result.error, "error");
    }
  };
}

export function ActionForm({
  action,
  children,
  className = "",
  successMessage,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  onSuccess?: (result: ActionResult, formData: FormData) => void;
}) {
  const [pending, startTransition] = useTransition();
  const notify = useActionToast();
  const { t } = useT();

  return (
    <form
      className={className}
      data-haptic="manual"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        // iOS only fires Taptic during a real tap. After await, Safari ignores it.
        if (shouldUseIosOverlays()) hapticSuccess();
        startTransition(async () => {
          try {
            const result = await action(formData);
            if (result.ok && successMessage && !result.message) {
              await notify({ ok: true, message: successMessage });
            } else {
              await notify(result);
            }
            if (result.ok) onSuccess?.(result, formData);
          } catch (error) {
            // A rejected save used to escape this transition and freeze the
            // iOS sheet (body scroll lock + a stuck router, so reload no-ops).
            const message =
              error instanceof Error && error.message.trim()
                ? error.message.trim()
                : t("action.saveFailed");
            await notify({ ok: false, error: message });
          }
        });
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
