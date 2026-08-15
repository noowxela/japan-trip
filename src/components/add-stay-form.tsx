import { addStay } from "@/app/actions";

export function AddStayForm() {
  return (
    <form
      action={addStay}
      className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4"
    >
      <p className="font-medium text-stone-900">Add a stay</p>
      <input
        name="name"
        required
        placeholder="Hotel name"
        className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="checkIn"
          type="date"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
        <input
          name="checkOut"
          type="date"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
      </div>
      <input
        name="address"
        placeholder="Address"
        className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
      />
      <input
        name="bookingUrl"
        type="url"
        placeholder="Booking URL"
        className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
      />
      <input
        name="confirmation"
        placeholder="Confirmation code"
        className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
      />
      <button
        type="submit"
        className="rounded-full bg-[#b42318] px-4 py-2 text-sm font-medium text-white"
      >
        Add stay
      </button>
    </form>
  );
}
