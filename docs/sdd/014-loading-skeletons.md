# SDD: Loading skeletons match compact pages

- **Repo:** `o000o_active/japan_trip_app`
- **Status:** `implemented`
- **Date:** 2026-10-29
- **Related:** [architecture](../architecture.md), [007 skeletons](007-map-feedback-a11y.md), [008 compact schedule/budget/map](008-compact-schedule-budget-map.md), [009 compact all pages](009-compact-all-pages.md)

## 1. Context / current architecture

SDD 007 added `TimelineSkeletonPage` (time column + dot + white `rounded-xl` card per row, 28px title bar) and wired it into three `loading.tsx` files: `/`, `/schedule`, `/budget`. SDD 009 then made every page compact (`src/components/compact/`: `PageHeader`, `ChipRow`, `SummaryStrip`, `CompactRow` / `CompactRowList`, `SectionHeader`). The skeletons were never updated.

## 2. Problem and non-goals

**Problem:** (Alex 2026-10-29: "the loading skeleton need more fit with the page component, current some of the page loading skeleton look weird".) Measured at 390×844 with a 5 s artificial data delay:

- Only `/`, `/schedule`, `/budget` had a `loading.tsx`; the root one wrapped every other route, so Places / Stays / Transit / Lists / Days / Prep / More / Phrases / Map all showed the old timeline-card skeleton, then jumped to a totally different compact layout.
- `/schedule` showed a page-shell timeline in place of the full-screen map + 72 % sheet + day tabs.
- `/map` showed the timeline instead of the map + city drawer; then the Leaflet chunk showed a centred "Loading map…" text before the drawer appeared.
- `/budget`: data loads in `budget/layout.tsx`, which sits **above** `budget/loading.tsx`, so the root timeline skeleton showed; `budget/loading.tsx` only ever rendered under the board while an expense detail loaded (no slide-in feedback).
- Card shapes (white cards, 28px title bar, 2.75rem/1.5rem grid) matched no current page; offline fallbacks for `/schedule` and `/phrases` flashed a centred text line.

**Non-goals:** changing any loaded page layout or `/map` drawer behaviour (3 heights stay as in SDD 008); new deps; Notion / `.env*` / `notion/` scripts.

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| Map skeleton shape? | Match the drawer version (city sheet at mid height), do not change map behaviour. |
| Animation? | Subtle `animate-pulse`, off under `prefers-reduced-motion`. |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:**

1. `src/components/compact/skeleton.tsx`: primitives that reuse the compact box sizes: `SkeletonHeader` (16px eyebrow + 24px title + h-8 action), `SkeletonChips` (h-7 pills), `SkeletonStrip` (SummaryStrip), `SkeletonSectionHeader` (h-7), `SkeletonRow(s)` (CompactRow: min-h-11, 20+16px lines, w-16 time/date/check leading, 40px trailing), `SkeletonSegmented`, `SkeletonPage` (PageShell + `role="status"`). Bars are `bg-ink/10` (works in dark mode).
2. `src/components/page-skeletons.tsx`: one skeleton per page composed top-down from the primitives (Overview, Lists, Places, Stays, Transit, Days, Prep, Settings, Phrases, Budget, ExpenseDetail, Schedule, TripMap, MapArea).
3. A `loading.tsx` for every data route; `budget/[id]/loading.tsx` renders inside the persistent `SlideInPage`; `budget/loading.tsx` removed.
4. Root `app/loading.tsx` picks the Budget skeleton for `/budget*` (pure `rootSkeletonFor`, tested) because the budget layout fetches above any nested boundary; Overview otherwise.
5. In-component placeholders reuse the same skeletons: `TripMapLoader` / `DayMapLoader` dynamic `loading`, `ScheduleOfflineFallback` and `PhrasesOfflineFallback` "not ready" state.
6. Remove `timeline-skeleton.tsx` and the two unused i18n keys (`a11y.loadingTimeline`, `schedule.loadingSaved`).

**Pros:** Skeleton → content swap keeps header, chips, strip and first list at the same y (verified ±1–2px); one primitive set to keep in sync with `compact/`.

**Cons / risks:** Row counts are fixed guesses (e.g. 10 places, 6 transit); Schedule skeleton omits the during-trip "Now" banner (56px) since phase is unknown.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Move budget data into a `Suspense` inside `budget/layout.tsx` | Client nav still hits the root `loading.tsx` first (prefetch stops at the nearest `loading.js`), so a wrong skeleton would flash. |
| Route group for `/` or `/budget` | Large file moves for the same result. |
| Generic one-size skeleton | That is the current bug. |

**Picture:**

```text
Before (every list page)          After (/places)
+--------------------------+      +--------------------------+
| ▭▭▭                      |      | ▭▭  (eyebrow)      (▭▭▭) |
| ▭▭▭▭▭▭▭▭▭                |      | ▭▭▭ (title)              |
| ▭  •  [▭▭▭▭▭▭▭▭▭▭▭▭▭▭]   |      | (▭) (▭▭) (▭) (▭)  chips  |
|       [▭▭▭▭▭▭▭     ]     |      | [ search field         ] |
| ▭  •  [▭▭▭▭▭▭▭▭▭▭▭▭▭▭]   |      | (▭) (▭▭) (▭) (▭)         |
|       [▭▭▭▭▭▭▭     ]     |      | +----------------------+ |
|  ...                     |      | | ▭▭▭▭▭▭▭▭        ·  | |
+--------------------------+      | | ▭▭▭▭▭           ·  | |
                                  +--------------------------+
```

## 5. Acceptance criteria and verification

- [x] Every data route has a matching skeleton (`/`, `/schedule`, `/budget`, `/budget/[id]`, `/places`, `/stays`, `/transit`, `/lists`, `/days`, `/prep`, `/settings`, `/phrases`, `/map`)
- [x] First list / chips / strip top within 2px of the loaded page at 390×844 (puppeteer probe, mock Notion + 5 s delay); light + dark screenshots
- [x] Client navigation `/` → `/budget` shows the Budget skeleton; expense detail shows the slide-in with skeleton immediately
- [x] `/map` drawer behaviour unchanged; skeleton sheet = 45dvh (desktop: 360px panel)
- [x] `prefers-reduced-motion` disables pulse; `role="status"` + `aria-busy` with localized label
- [x] `npx tsc --noEmit`, `npx eslint --max-warnings 0`, `npm test`, `npx next build`

## 6. Status history

| Date | Status | Note |
| --- | --- | --- |
| 2026-10-29 | implemented | Owner request (Alex 2026-10-29); compact skeleton primitives + per-route loading UIs |
