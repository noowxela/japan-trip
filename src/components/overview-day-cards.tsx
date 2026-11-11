import Link from "next/link";
import { formatDay, formatTabDate } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import {
  buildOverviewDayCards,
  type OverviewDatedDay,
  type OverviewDayCardModel,
  type OverviewDayCardState,
} from "@/lib/overview-day-cards";

function cardClass(state: OverviewDayCardState) {
  const base =
    "flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-0.5 py-1.5 text-center no-underline outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";
  if (state === "today") {
    return `${base} border-accent bg-accent/10 text-accent`;
  }
  if (state === "past") {
    return `${base} border-line bg-surface text-ink-muted opacity-70`;
  }
  return `${base} border-line bg-surface text-ink`;
}

function DayCardLink({
  card,
  locale,
}: {
  card: OverviewDayCardModel;
  locale: Locale;
}) {
  const dateLabel = formatDay(card.date, locale);
  const aria =
    card.state === "today"
      ? t(locale, "overview.dayCardTodayAria", {
          n: card.dayNumber,
          date: dateLabel,
        })
      : t(locale, "overview.dayCardAria", {
          n: card.dayNumber,
          date: dateLabel,
        });

  return (
    <Link
      href={`/schedule?day=${encodeURIComponent(card.id)}`}
      aria-label={aria}
      aria-current={card.state === "today" ? "date" : undefined}
      className={cardClass(card.state)}
    >
      <span className="text-[15px] font-semibold leading-none tabular-nums">
        {card.dayNumber}
      </span>
      <span
        className={`whitespace-nowrap text-[9px] leading-none tabular-nums ${
          card.state === "today" ? "text-accent" : "text-ink-muted"
        }`}
      >
        {formatTabDate(card.date)}
      </span>
    </Link>
  );
}

export function OverviewDayCards({
  days,
  today,
  locale,
}: {
  days: readonly OverviewDatedDay[];
  today: string;
  locale: Locale;
}) {
  const cards = buildOverviewDayCards(days, today);
  if (cards.length === 0) return null;

  return (
    <nav aria-label={t(locale, "overview.dayCards")} className="min-w-0">
      <ul className="flex gap-1">
        {cards.map((card) => (
          <li key={card.id} className="min-w-0 flex-1">
            <DayCardLink card={card} locale={locale} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
