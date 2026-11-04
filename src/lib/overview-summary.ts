import { dateKey, dayDiff, formatTripSpan } from "@/lib/format";
import type { DepartureCountdown } from "@/lib/departure-countdown";
import { t, type Locale } from "@/lib/i18n/dictionaries";

/** Build the one-line overview SummaryStrip: "Day 3/8 · span · cities". */
export function formatOverviewSummaryLine(input: {
  today: string;
  tripStart: string | null;
  tripEnd: string | null;
  cityFlow: string;
  locale: Locale;
  dayCount: number;
  /** From departureCountdown(); hours/minutes override the day wording (< 48h). */
  departure?: DepartureCountdown;
}): string {
  const { today, tripStart, tripEnd, cityFlow, locale, dayCount, departure } =
    input;
  const span = formatTripSpan(tripStart, tripEnd, locale);
  const startKey = dateKey(tripStart);
  const endKey = dateKey(tripEnd) ?? startKey;

  let dayBit = "";
  if (startKey && endKey && dayCount > 0) {
    const until = dayDiff(today, startKey);
    if (until >= 0 && departure?.mode === "hours") {
      dayBit = t(locale, "overview.summaryBeforeHours", { n: departure.hours });
    } else if (until >= 0 && departure?.mode === "minutes") {
      dayBit = t(locale, "overview.summaryBeforeMinutes", {
        n: departure.minutes,
      });
    } else if (until > 0) {
      dayBit = t(locale, "overview.summaryBefore", { n: until });
    } else if (today > endKey) {
      dayBit = t(locale, "overview.summaryDone", { n: dayCount });
    } else {
      const dayNumber = dayDiff(startKey, today) + 1;
      dayBit = t(locale, "overview.summaryDay", {
        n: dayNumber,
        total: dayCount,
      });
    }
  }

  return [dayBit, span, cityFlow].filter(Boolean).join(" · ");
}
