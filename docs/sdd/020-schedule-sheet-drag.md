# SDD: Schedule sheet drag + tall map snap

- **Repo:** `o000o_active/japan_trip_app`
- **Status:** `implemented`
- **Date:** 2026-11-04
- **Related:** [008 compact schedule/map](008-compact-schedule-budget-map.md), [009 compact all pages](009-compact-all-pages.md), [015 offline navigation](015-offline-navigation.md)

## 1. Context / current architecture

`/schedule` (`src/components/schedule-view.tsx`) is a full-bleed day map over a bottom sheet. The sheet height was one of `SNAPS = [0.55, 0.72, 0.92]` of the page root (default `0.72`), floored by `min-h-64`. Only a 16px-tall handle button dragged it (`TAP_SLOP_PX = 10`, nearest-snap on release); a click toggled default ↔ top. Map fullscreen (`mapFullscreen` → `DayMap fullscreen`) collapses the sheet to 0. The offline route renders the same `ScheduleView` (`schedule-offline.tsx`).

## 2. Problem and non-goals

**Problem:** (Alex 2026-11-04: "I want the drawer more easy to drag and the map able to enlarge to 90% of the screen".) Measured at 390×844 on a local prod build: the map could only be 45% / 28% / 8% of the screen; the drag target was 16px tall; the day tabs and day title did not drag; a release never honoured a flick.

**Non-goals:** changing the default snap or desktop layout; `/map` (`trip-map.tsx`) sheet; new deps; push.

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| Target map size? | ~85–90% of the screen when collapsed. |
| Push? | No; local commit only. |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:**

1. **Snaps** `[0.17, 0.45, 0.72, 0.92]`, default index 2 (`0.72`, unchanged). `0.17` (143px at 844) = 44px handle + 37px day tabs + sliver of the day title; the `min-h-64` floor is gone. The bottom of the tab row (783px) stays above the quick-add / Overview pills (784px).
2. **Drag from the whole header:** pointer handlers sit on the `<section>`; a pointerdown counts only inside `[data-sheet-drag]` (handle, day-tab row, sticky day title). It becomes a drag after `DRAG_THRESHOLD_PX = 10` of mostly-vertical travel (horizontal → abandoned so tabs still scroll), then captures the pointer and tracks 1:1. The click after a drag is swallowed in the capture phase. `touch-action`: handle + sticky title `none`, tab row `pan-x`, scroll pane untouched (`auto`).
3. **Momentum:** pointermove samples from the last 100ms give a release velocity; ≥ 0.5 px/ms moves one snap from the start in the flick direction (never undoing a longer drag), otherwise nearest snap.
4. **Handle:** 44px tall, full width; tap cycles up through the snaps and wraps to the lowest. Arrow/Home/End unchanged; label = 收起行程 at the top snap (next tap collapses), else 展开行程; `aria-expanded` false only at the lowest snap. No new strings.
5. **Pure math** in `src/lib/sheet-drag.ts` (`nearestSnap`, `clampSheetHeight`, `pushSample`, `releaseVelocity`, `releaseSnap`, `cycleSnap`) with Vitest tests.
6. `DayQuickFab` wrapper is `pointer-events-none` (button `auto`) so its full-width strip no longer eats taps on the sheet under it.

**Pros:** map reaches 83%; drag target grows from 16px to ~142px of header; flicks feel native; no new deps.

**Cons / risks:** touching the sticky day title no longer scrolls the agenda (it drags the sheet). Four snaps make a full tap cycle four taps. 83% is a little under the 85% wish — going lower puts the tab row under the floating quick-add / Overview pills.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Snap 0.14 (map 86%) | Tab row bottom 791px overlaps quick-add / Overview pills at 784px. |
| Drag from the whole sheet incl. agenda | Fights the agenda scroll and swipe actions (SDD 010). |
| Library (vaul, react-spring) | New dep for ~100 lines of math. |

**Picture:**

```text
390×844   before (map %)        after (map %)
snap 0    45  (0.55)            83  (0.17)  ← new
snap 1    28  (0.72, default)   55  (0.45)
snap 2     8  (0.92)            28  (0.72, default)
snap 3     —                     8  (0.92)
```

## 5. Acceptance criteria and verification

- [x] Map 83% / 55% / 28% / 8% at the four snaps (before 45 / 28 / 8)
- [x] Handle 390×44px; tap cycles 55 → 28 → 8 → 83 → 55% with labels 展开/展开/收起/展开
- [x] Slow 60px drags (12 × 5px steps, 40ms) from handle, day tab and day title track 1:1 (608 → 668 / 548px) and settle to nearest (default); no day change from a drag on a tab
- [x] Slow 200px up → top snap; 260px down → 0.45
- [x] Fast 40px flick (4 steps, 8ms) up from default → top; down → 0.45 (handle and day tab)
- [x] Day-tab tap changes `?day=` and keeps the snap at every snap; quick-add opens (unlock modal when locked) at every snap; map fullscreen → 99.9% and back to the same snap at every snap
- [x] Desktop 1280×800 default unchanged: sheet 576px, map 28%
- [x] No page errors; pane `touch-action: auto`
- [x] `npm run lint`, `npm run typecheck`, `npm test` (195), `npm run build`

**Verification:** Playwright + Chromium against `next start -p 3101`, 390×844, `zh-CN`, mouse pointer events. Screenshots in `/tmp/kc-sheet/` (`before-*`, `after-snap{0..3}-*`, `after-desktop-1280.png`). Real touch (iOS Safari momentum, pan-x on tabs) not device-checked.

## 6. Status history

- 2026-11-04 — implemented (local commit, not pushed)
