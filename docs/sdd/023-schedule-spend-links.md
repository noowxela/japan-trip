# SDD: Link expenses to a schedule place or transit

- **Repo:** `o000o_active/japan_trip_app`
- **Status:** `implemented`
- **Date:** 2026-11-15
- **Related:** [architecture](../architecture.md), [006 quick expense](006-quick-expense-forms.md), [004 offline](004-offline-mode.md)

## 1. Context

Schedule stops (Places and Transit) and expenses (Spend) only shared a Day relation. A food expense could already point at one Place (`Spend.placeId`) once `npm run migrate:spend-place` was run, but the live workspace did not have that column, the picker was Food/Cafe only, and Transit could not be linked. Creating a Grab ride on the schedule and logging its fare created two unlinked rows.

## 2. Problem and non-goals

**Problem:** One schedule item should be able to link to zero, one, or many expenses (for example KLIA → Desa Green ride-hailing plus its RM fare). From the schedule, the user wants to add a prefilled expense or attach an existing one, and see a count plus total on the row.

**Non-goals:** Merging Place and Transit into one Notion database. Offline writes for “link existing” (agenda edits stay online-only). Automatic backfill by name. Changing Transit Mode options (Ride-hailing is a separate change).

## 3. Approach

Relations live on Spend, which matches `addSpend`, the outbox, and the existing Place migration:

- `Spend.Place` → Places (run `migrate:spend-place`; one-way)
- `Spend.Transit` → Transit (`migrate:spend-transit`; two-way when Notion accepts `dual_property`)

A spend links to at most one schedule item (XOR). Many spends may point at the same stop. Helpers in `src/lib/spend-link.ts` resolve links and RM+JPY totals. `addSpend` / `updateSpend` / `linkSpendToSchedule` write both relations with the same fallback style as Place. Quick expense and the full spend form pick any same-day place or transit. Schedule row/edit sheet offer “＋ 记一笔花费” (prefilled) and “关联已有花费”, and the row shows count + dual RM/Yen total.

**Offline:** Creating an expense from a row still goes through the addSpend outbox (`placeId` / `transitId` on the payload). Linking an existing expense is online-only. The itinerary snapshot already stores `spend[]`; the new fields are additive (no snapshot version bump). `bump(TRIP_TAGS.spend)` refreshes the Notion cache.

## 4. Acceptance

- [x] One-shot migrates add the columns without changing existing row values
- [x] A schedule row can create a prefilled expense and link or unlink existing ones
- [x] Linked count and RM+JPY total show on the schedule row
- [x] XOR: a spend cannot stay linked to both a place and a transit
- [x] Unit tests for helpers and form/outbox payload; i18n zh+en for new strings
