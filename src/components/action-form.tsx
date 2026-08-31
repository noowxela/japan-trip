"use client";

import { useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/toast-provider";

export function useActionToast() {
  const { toast } = useToast();

  return async (result: ActionResult) => {
    if (result.ok) {
      if (result.message) toast(result.message);
    } else {
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
  onSuccess?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const notify = useActionToast();

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await action(formData);
          if (result.ok && successMessage && !result.message) {
            await notify({ ok: true, message: successMessage });
          } else {
            await notify(result);
          }
          if (result.ok) onSuccess?.();
        });
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
