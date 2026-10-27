"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { lockEditor, unlockEditor } from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { useEditSession } from "@/components/edit-session";
import { useT } from "@/components/i18n-provider";
import {
  btnGhostClass,
  btnPrimaryClass,
  cardClass,
  fieldClass,
} from "@/components/page-shell";

const PIN_LEN = 4;

export function UnlockEditorCard() {
  const { canEdit, editorName } = useEditSession();
  const { t } = useT();
  const notify = useActionToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [pending, startTransition] = useTransition();
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const submittedRef = useRef(false);

  if (canEdit && editorName) {
    return (
      <div className={cardClass}>
        <p className="text-sm font-medium text-ink">{t("editor.unlocked")}</p>
        <p className="mt-1 text-sm text-ink-muted">
          {t("editor.unlockedDetail", { name: editorName })}
        </p>
        <button
          type="button"
          className={`${btnGhostClass} mt-3`}
          onClick={() => {
            startTransition(async () => {
              await notify(await lockEditor());
              router.refresh();
            });
          }}
        >
          {t("editor.lock")}
        </button>
      </div>
    );
  }

  if (canEdit) {
    return (
      <div className={cardClass}>
        <p className="text-sm font-medium text-ink">{t("editor.open")}</p>
        <p className="mt-1 text-sm text-ink-muted">{t("editor.openDetail")}</p>
      </div>
    );
  }

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
      await notify(result);
      if (!result.ok) {
        fail(result.error);
        return;
      }
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

  return (
    <div className={cardClass}>
      <p className="text-sm font-medium text-ink">{t("editor.unlock")}</p>
      <p className="mt-1 text-sm text-ink-muted">{t("editor.unlockHint")}</p>
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-ink-muted">
            {t("editor.name")}
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="username"
            className={fieldClass}
          />
        </label>
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-ink-muted">
            {t("editor.pin")}
          </span>
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
          className={btnPrimaryClass}
        >
          {pending ? t("common.working") : t("editor.unlockBtn")}
        </button>
      </div>
    </div>
  );
}
