"use client";

import { useTransition } from "react";
import { updatePlaceNotes } from "@/app/actions";
import { useActionToast } from "@/components/action-form";

export function NotesForm({ id, notes }: { id: string; notes: string }) {
  const [pending, startTransition] = useTransition();
  const notify = useActionToast();

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
      <label className="block text-xs font-medium uppercase tracking-wide text-stone-500">
        Notes
        <textarea
          name="notes"
          defaultValue={notes}
          rows={3}
          className="mt-1 w-full min-w-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-[#b42318]"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-medium text-[#b42318] hover:underline disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save notes"}
      </button>
    </form>
  );
}
