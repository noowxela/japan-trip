import { addTransit } from "@/app/actions";
import { TRANSIT_MODES, type TripDay } from "@/lib/types";

export function AddTransitForm({
  days,
  defaultDayId,
}: {
  days: TripDay[];
  defaultDayId?: string;
}) {
  return (
    <form
      action={addTransit}
      className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4"
    >
      <p className="font-medium text-stone-900">Add transit</p>
      <input
        name="name"
        required
        placeholder="Nozomi 12"
        className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          name="mode"
          defaultValue="Shinkansen"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        >
          {TRANSIT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
        <input
          name="date"
          type="date"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="from"
          placeholder="From"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
        <input
          name="to"
          placeholder="To"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
      </div>
      <input
        name="bookingUrl"
        type="url"
        placeholder="Booking URL"
        className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
      />
      <select
        name="dayId"
        defaultValue={defaultDayId ?? ""}
        className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
      >
        <option value="">No day yet</option>
        {days.map((day) => (
          <option key={day.id} value={day.id}>
            {day.name}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="start"
          type="datetime-local"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
        <input
          name="order"
          type="number"
          placeholder="Order"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
      </div>
      <button
        type="submit"
        className="rounded-full bg-[#b42318] px-4 py-2 text-sm font-medium text-white"
      >
        Add transit
      </button>
    </form>
  );
}
