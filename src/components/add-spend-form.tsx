import { addSpend } from "@/app/actions";
import { formShellClass } from "@/components/page-shell";
import { SpendAmountField } from "@/components/spend-amount-field";
import { SPEND_CATEGORIES, SPEND_KINDS, type TripDay } from "@/lib/types";

export function AddSpendForm({ days }: { days: TripDay[] }) {
  return (
    <form
      action={addSpend}
      className={`${formShellClass} grid gap-3 rounded-2xl border border-stone-200 bg-white p-4`}
    >
      <p className="font-medium text-stone-900">Add spend</p>
      <input
        name="name"
        required
        placeholder="Lunch / hotel / JR pass"
        className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
      />
      <SpendAmountField />
      <div className="grid grid-cols-2 gap-3">
        <select
          name="kind"
          defaultValue="Estimate"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        >
          {SPEND_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue="Food"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        >
          {SPEND_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <select
        name="dayId"
        defaultValue=""
        className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
      >
        <option value="">No day</option>
        {days.map((day) => (
          <option key={day.id} value={day.id}>
            {day.name}
          </option>
        ))}
      </select>
      <input
        name="notes"
        placeholder="Notes"
        className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
      />
      <button
        type="submit"
        className="rounded-full bg-[#b42318] px-4 py-2 text-sm font-medium text-white"
      >
        Add spend
      </button>
    </form>
  );
}
