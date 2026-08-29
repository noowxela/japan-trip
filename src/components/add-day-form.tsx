import { addDay } from "@/app/actions";
import { formShellClass } from "@/components/page-shell";
import { CITIES } from "@/lib/types";

export function AddDayForm() {
  return (
    <form
      action={addDay}
      className={`${formShellClass} grid gap-3 rounded-2xl border border-stone-200 bg-white p-4`}
    >
      <p className="font-medium text-stone-900">Add a day</p>
      <input
        name="name"
        required
        placeholder="Day 1 — Shibuya"
        className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="date"
          type="date"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
        <select
          name="city"
          defaultValue="Tokyo"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        >
          {CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="rounded-full bg-[#b42318] px-4 py-2 text-sm font-medium text-white"
      >
        Add day
      </button>
    </form>
  );
}
