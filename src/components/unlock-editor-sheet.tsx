"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockEditor } from "@/app/actions";
import { useT } from "@/components/i18n-provider";
import { Modal } from "@/components/modal";
import { btnPrimaryClass, fieldClass } from "@/components/page-shell";
import { useToast } from "@/components/toast-provider";

const PIN_LEN = 4;

export function UnlockEditorSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useT();

  return (
    <Modal open={open} onClose={onClose} title={t("editor.unlock")}>
      {open ? <UnlockEditorForm key="unlock-open" onClose={onClose} /> : null}
    </Modal>
  );
}

function UnlockEditorForm({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [pending, startTransition] = useTransition();
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const submittedRef = useRef(false);

  function fail(message: string) {
    setError(message);
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
    setPin("");
    submittedRef.current = false;
    pinRefs.current[0]?.focus();
  }

  function submit(nextPin = pin) {
    if (pending || submittedRef.current) return;
    if (!name.trim() || nextPin.length < PIN_LEN) {
      fail(t("editor.pinIncomplete"));
      return;
    }
    submittedRef.current = true;
    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("pin", nextPin);
    startTransition(async () => {
      const result = await unlockEditor(formData);
      if (!result.ok) {
        fail(result.error);
        toast(result.error, "error");
        return;
      }
      if (result.message) toast(result.message);
      onClose();
      router.refresh();
    });
  }

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const chars = pin.padEnd(PIN_LEN, " ").split("");
    chars[index] = digit || " ";
    const next = chars.join("").replace(/ /g, "").slice(0, 6);
    setPin(next);
    if (digit && index < PIN_LEN - 1) {
      pinRefs.current[index + 1]?.focus();
    }
    if (digit && next.length >= PIN_LEN) {
      submit(next);
    }
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="grid gap-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)]">
      <p className="text-sm text-ink-muted">{t("editor.unlockHint")}</p>
      <label className="grid gap-1">
        <span className="text-xs font-medium text-ink-muted">{t("editor.name")}</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="username"
          className={fieldClass}
        />
      </label>
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-ink-muted">{t("editor.pin")}</span>
        <div
          className={`flex justify-center gap-2 ${
            shake
              ? "animate-[shake_0.4s_ease-in-out] motion-reduce:animate-none"
              : ""
          }`}
        >
          {Array.from({ length: PIN_LEN }, (_, index) => (
            <input
              key={index}
              ref={(el) => {
                pinRefs.current[index] = el;
              }}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={1}
              value={pin[index] ?? ""}
              aria-label={t("editor.pinDigit", { n: index + 1 })}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => onKeyDown(index, event)}
              className="h-12 w-11 rounded-xl border border-line bg-surface text-center text-xl font-semibold text-ink outline-none focus:border-accent"
            />
          ))}
        </div>
      </div>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => submit()}
        className={`${btnPrimaryClass} w-full py-3`}
      >
        {pending ? t("common.working") : t("editor.unlockBtn")}
      </button>
    </div>
  );
}
