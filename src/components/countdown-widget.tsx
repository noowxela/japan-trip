import { formatDay, formatTripSpan } from "@/lib/format";

type CountdownWidgetProps = {
  startDate: string | null;
  endDate: string | null;
  today: string;
  cityFlow: string;
};

export function CountdownWidget({
  startDate,
  endDate,
  today,
  cityFlow,
}: CountdownWidgetProps) {
  const countdown = buildCountdown(startDate, endDate, today);
  const span = formatTripSpan(startDate, endDate);

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="bg-[#b42318] px-4 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-white/80">
          Countdown
        </p>
        <p className="mt-1 font-serif text-4xl tracking-tight">
          {countdown.primary}
        </p>
        <p className="mt-1 text-sm text-white/85">{countdown.secondary}</p>
      </div>
      <div className="space-y-1 px-4 py-4">
        <p className="text-sm font-medium text-stone-800">{span}</p>
        {cityFlow ? (
          <p className="text-sm text-stone-500">{cityFlow}</p>
        ) : null}
      </div>
    </section>
  );
}

function buildCountdown(
  startDate: string | null,
  endDate: string | null,
  today: string,
) {
  if (!startDate) {
    return {
      primary: "—",
      secondary: "Add trip dates to start the countdown",
    };
  }

  const start = startDate.slice(0, 10);
  const end = endDate?.slice(0, 10) ?? start;
  const startMs = Date.parse(`${start}T00:00:00+09:00`);
  const endMs = Date.parse(`${end}T23:59:59+09:00`);
  const todayMs = Date.parse(`${today}T12:00:00+09:00`);

  if (todayMs < startMs) {
    const days = Math.ceil((startMs - todayMs) / 86_400_000);
    return {
      primary: days === 1 ? "1 day" : `${days} days`,
      secondary: `Until departure · ${formatDay(startDate)}`,
    };
  }

  if (todayMs <= endMs) {
    const dayNumber =
      Math.floor((todayMs - startMs) / 86_400_000) + 1;
    const totalDays = Math.floor((endMs - startMs) / 86_400_000) + 1;
    return {
      primary: `Day ${dayNumber}`,
      secondary: `On trip · ${dayNumber} of ${totalDays}`,
    };
  }

  const daysSince = Math.floor((todayMs - endMs) / 86_400_000);
  return {
    primary: daysSince <= 1 ? "Trip ended" : `${daysSince} days ago`,
    secondary: `Last day was ${formatDay(endDate ?? startDate)}`,
  };
}
