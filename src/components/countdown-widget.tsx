import { tripCountdown } from "@/lib/format";

export function CountdownWidget({
  start,
  end,
  today,
}: {
  start: string | null;
  end: string | null;
  today: string;
}) {
  const countdown = tripCountdown(start, end, today);
  if (!countdown) return null;

  return (
    <div className="notebook-card min-w-0 p-5 md:max-w-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-moss">
        {countdown.label}
      </p>
      <p className="mt-1 text-4xl font-semibold tracking-tight text-stone-900">
        {countdown.primary}
      </p>
      {countdown.secondary ? (
        <p className="mt-1 text-sm text-stone-500">{countdown.secondary}</p>
      ) : null}
    </div>
  );
}
