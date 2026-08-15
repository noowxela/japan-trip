import { toggleVisited } from "@/app/actions";

export function VisitedToggle({
  id,
  visited,
}: {
  id: string;
  visited: boolean;
}) {
  return (
    <form action={toggleVisited}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="visited" value={visited ? "false" : "true"} />
      <button
        type="submit"
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          visited
            ? "bg-emerald-100 text-emerald-800"
            : "bg-stone-200 text-stone-700"
        }`}
      >
        {visited ? "Visited" : "Mark visited"}
      </button>
    </form>
  );
}
