import { updatePlaceNotes } from "@/app/actions";

export function NotesForm({ id, notes }: { id: string; notes: string }) {
  return (
    <form action={updatePlaceNotes} className="mt-3 space-y-2">
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
        className="text-sm font-medium text-[#b42318] hover:underline"
      >
        Save notes
      </button>
    </form>
  );
}
