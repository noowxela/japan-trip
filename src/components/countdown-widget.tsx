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
    <div className="min-w-0 rounded-2xl border border-[#14b8a6]/30 bg-gradient-to-br from-white to-teal-50/80 p-5 md:max-w-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-teal-700">
        {countdown.label}
      </p>
      <p className="mt-1 font-serif text-4xl tracking-tight text-stone-900">
        {countdown.primary}
      </p>
      {countdown.secondary ? (
        <p className="mt-1 text-sm text-stone-500">{countdown.secondary}</p>
      ) : null}
    </div>
  );
}
