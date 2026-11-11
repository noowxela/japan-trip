import Link from "next/link";
import { formatDay, formatTabDate } from "@/lib/format";
import { t, type Locale } from "@/lib/i18n/dictionaries";
import {
  autumnLeafVariant,
  buildOverviewDayCards,
  type AutumnLeafVariant,
  type OverviewDatedDay,
  type OverviewDayCardModel,
} from "@/lib/overview-day-cards";

const PAST_LEAF_CLASS: Record<AutumnLeafVariant, string> = {
  maple: "border-leaf-maple bg-leaf-maple-soft text-leaf-maple",
  rust: "border-leaf-rust bg-leaf-rust-soft text-leaf-rust",
  amber: "border-leaf-amber bg-leaf-amber-soft text-leaf-amber",
  gold: "border-leaf-gold bg-leaf-gold-soft text-leaf-gold",
  burnt: "border-leaf-burnt bg-leaf-burnt-soft text-leaf-burnt",
};

function cardClass(card: OverviewDayCardModel) {
  const base =
    "flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-0.5 py-1.5 text-center no-underline outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";
  if (card.state === "today") {
    return `${base} border-ok bg-ok-soft text-ok`;
  }
  if (card.state === "past") {
    return `${base} ${PAST_LEAF_CLASS[autumnLeafVariant(card.index)]}`;
  }
  return `${base} border-line bg-surface text-ink`;
}

function dateClass(card: OverviewDayCardModel) {
  if (card.state === "today") return "text-ok";
  if (card.state === "past") return undefined;
  return "text-ink-muted";
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
      className={cardClass(card)}
    >
      <span className="text-[15px] font-semibold leading-none tabular-nums">
        {card.dayNumber}
      </span>
      <span
        className={`whitespace-nowrap text-[9px] leading-none tabular-nums ${dateClass(card) ?? ""}`}
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
