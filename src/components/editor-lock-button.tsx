"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { lockEditor } from "@/app/actions";
import { useEditSession } from "@/components/edit-session";
import { useT } from "@/components/i18n-provider";
import { useUnlock } from "@/components/unlock-provider";
import { useToast } from "@/components/toast-provider";

export function EditorLockButton({ className = "" }: { className?: string }) {
  const { canEdit, editorName } = useEditSession();
  const { openUnlock } = useUnlock();
  const { t } = useT();
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const unlocked = canEdit && Boolean(editorName);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (unlocked) {
          startTransition(async () => {
            const result = await lockEditor();
            if (result.ok) {
              if (result.message) toast(result.message);
              router.refresh();
            } else {
              toast(result.error, "error");
            }
          });
          return;
        }
        openUnlock();
      }}
      aria-label={unlocked ? t("editor.lock") : t("editor.unlock")}
      title={
        unlocked
          ? t("editor.editingAs", { name: editorName ?? "" })
          : t("editor.locked")
      }
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink ${className}`.trim()}
    >
      {unlocked ? (
        <PencilIcon />
      ) : (
        <LockIcon />
      )}
    </button>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5z" />
    </svg>
  );
}
