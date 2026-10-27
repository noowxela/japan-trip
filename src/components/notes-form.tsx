"use client";

import { useState, useTransition } from "react";
import { updatePlaceNotes } from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { useCanEdit } from "@/components/edit-session";
import { useT } from "@/components/i18n-provider";

export function NotesForm({ id, notes }: { id: string; notes: string }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const notify = useActionToast();
  const canEdit = useCanEdit();
  const { t } = useT();
  const preview = notes.trim();

  if (!canEdit) {
    if (!preview) return null;
    return (
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className={`mt-3 block w-full text-left text-sm text-ink-muted ${
          expanded ? "whitespace-pre-wrap" : "line-clamp-2"
        }`}
      >
        {preview}
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-3 block w-full text-left text-sm text-ink-muted hover:text-ink ${
          preview ? "line-clamp-2" : "truncate"
        }`}
      >
        {preview || t("notes.add")}
      </button>
    );
  }

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => notify(await updatePlaceNotes(formData)));
      }}
    >
      <input type="hidden" name="id" value={id} />
      <label className="block text-xs font-medium text-ink-muted">
        {t("form.notes")}
        <textarea
          name="notes"
          defaultValue={notes}
          rows={3}
          autoFocus
          className="mt-1 w-full min-w-0 rounded-xl border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-accent"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="text-sm font-medium text-ink-muted no-underline disabled:opacity-60"
        >
          {pending ? t("common.saving") : t("notes.save")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-ink-muted hover:text-ink"
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
