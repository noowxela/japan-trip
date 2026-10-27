import { eyebrowClass } from "@/components/page-shell";
import { tripCountdown } from "@/lib/format";
import { getLocale } from "@/lib/i18n/server";

export async function CountdownWidget({
  start,
  end,
  today,
}: {
  start: string | null;
  end: string | null;
  today: string;
}) {
  const countdown = tripCountdown(start, end, today, await getLocale());
  if (!countdown) return null;

  return (
    <div className="notebook-card min-w-0 p-5 md:max-w-xl">
      <p className={eyebrowClass}>{countdown.label}</p>
      <p className="mt-1 text-4xl font-semibold tracking-tight text-ink tabular-nums">
        {countdown.primary}
      </p>
      {countdown.secondary ? (
        <p className="mt-1 text-sm text-ink-muted tabular-nums">{countdown.secondary}</p>
      ) : null}
    </div>
  );
}
