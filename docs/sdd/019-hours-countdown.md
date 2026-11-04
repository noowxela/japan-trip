# SDD: Hour-based departure countdown (< 48h)

- **Repo:** `o000o_active/japan_trip_app`
- **Status:** `implemented`
- **Date:** 2026-11-04
- **Related:** [013 daily countdown push](013-daily-countdown-push.md)

## 1. Context / current architecture

The home summary strip (`src/app/page.tsx` → `formatOverviewSummaryLine` in `src/lib/overview-summary.ts`) shows `还有{n}天出发` from a Tokyo calendar-day diff, rendered once on the server (`force-dynamic`). `CountdownWidget` (`tripCountdown`) is day-based too but is not currently rendered on any page.

## 2. Problem and non-goals

**Problem:** (Alex 2026-11-04: "the counter if less then 2 day need showing the hour counter to the flight departure".) Under 48h, "还有2天出发" is coarse and can be wrong by most of a day; it should count hours to the flight.

**Non-goals:** changing the on-trip / complete wording; the morning push countdown (SDD 013); a seconds ticker; new deps.

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| Threshold? | Strictly under 48h → hours; exactly 48h keeps day wording. |
| Under 1h? | Minutes. |
| Which instant? | Day 1's flight start, Asia/Tokyo wall time. |
| Push? | No; local commit only. |

## 4. Approach, pros / cons, rejected alternatives

**Approach:**

1. `src/lib/departure-countdown.ts`: pure `departureCountdown(iso, nowMs)` → `days | hours | minutes | departed | today`. ≥ 48h or unknown → `days`; < 48h → `hours` (ceil); < 1h → `minutes` (ceil, min 1); ≤ 0 → `departed` (existing Day N / complete wording). `today` is reserved for callers that only know the date.
2. `departureInstant(days, transit)`: earliest-start `Flight` on the first dated day (by `dayIds` or `date`), else earliest timed transit that day, built with `tokyoWallDateTime`. **Fallback:** no time → `null` → day-based countdown on the start date (unchanged behaviour).
3. `formatOverviewSummaryLine` takes optional `departure`; hours/minutes replace the day bit also on the departure day before take-off.
4. `src/components/departure-summary.tsx` (client): first render uses the server's `initialNowMs` (identical SSR/hydration), then `Date.now()` on mount and every 30s.
5. i18n: `overview.summaryBeforeHours` 还有 {n} 小时出发 / `{n}h to departure`; `overview.summaryBeforeMinutes` 还有 {n} 分钟出发 / `{n} min to departure`; `countdown.hour/hours/minutes` for a future widget line.

**Pros:** tiny diff, pure tested logic, no hydration mismatch, reuses Tokyo helpers.
**Cons:** the whole summary line is now client-rendered text (still SSR'd); a stale tab drifts ≤ 30s.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Server-only render | Doesn't tick; a PWA left open shows stale hours. |
| Client renders `Date.now()` immediately | Hydration mismatch. |
| Hand-rolled `+9h` offsets | Repo rule: use `tokyoWallDateTime`. |
| Update `CountdownWidget` | Not rendered anywhere; deferred (see todo). |

## 5. Acceptance criteria and verification

- [x] Vitest: 3 days, exactly 48h, 47h, 47h59m, 100 min (→ 2h), 30 min, past, missing time, instant picking.
- [x] lint / typecheck / test / build clean (clean worktree of HEAD + this change).
- [x] Playwright, prod server :3102, 390×844, `page.clock.setFixedTime`: dep−72h → 还有3天出发; dep−41h → 还有 41 小时出发; live → 还有 27 小时出发; no hydration warnings. Screenshots `/tmp/kc-countdown/`.
