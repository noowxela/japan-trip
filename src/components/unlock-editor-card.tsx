"use client";

import { lockEditor, unlockEditor } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { useEditSession } from "@/components/edit-session";
import {
  btnGhostClass,
  btnPrimaryClass,
  cardClass,
  fieldClass,
} from "@/components/page-shell";

export function UnlockEditorCard() {
  const { canEdit, editorName } = useEditSession();

  if (canEdit && editorName) {
    return (
      <div className={cardClass}>
        <p className="text-sm font-medium text-stone-800">Editing unlocked</p>
        <p className="mt-1 text-sm text-stone-500">
          Editing as {editorName}. Viewers can still see the trip without a PIN.
        </p>
        <ActionForm action={lockEditor} className="mt-3">
          <button type="submit" className={btnGhostClass}>
            Lock editing
          </button>
        </ActionForm>
      </div>
    );
  }

  if (canEdit) {
    return (
      <div className={cardClass}>
        <p className="text-sm font-medium text-stone-800">Editing open</p>
        <p className="mt-1 text-sm text-stone-500">
          No Editors database is configured, so anyone on this device can
          change trip data.
        </p>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <p className="text-sm font-medium text-stone-800">Unlock editing</p>
      <p className="mt-1 text-sm text-stone-500">
        Enter your name and PIN from the Editors database in Notion.
      </p>
      <ActionForm action={unlockEditor} className="mt-3 grid gap-3">
        <input
          name="name"
          required
          autoComplete="username"
          placeholder="Name"
          className={fieldClass}
        />
        <input
          name="pin"
          required
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          placeholder="PIN"
          className={fieldClass}
        />
        <button type="submit" className={btnPrimaryClass}>
          Unlock
        </button>
      </ActionForm>
    </div>
  );
}
