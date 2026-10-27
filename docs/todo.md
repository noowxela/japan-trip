# Deferred work

Follow-ups from SDDs. Not a backlog of every idea — only deferred scope from approved/implemented changes.

| From | Item | Notes |
| --- | --- | --- |
| [002](sdd/002-tests-ci-lint.md) | E2E / Playwright | Explicit non-goal; revisit if CI should cover browser flows |
| [002](sdd/002-tests-ci-lint.md) | Notion integration tests | Need secrets + fixtures; keep out of default CI |
| [002](sdd/002-tests-ci-lint.md) | Vitest 5 | Blocked by peer `@types/node` / peer-only `vite` without installing extra packages |
| [003](sdd/003-unified-schedule-zh.md) | Browser verify Now scroll + pending sheet | Agent session could not run `next dev`; spot-check on device |
| [003](sdd/003-unified-schedule-zh.md) | Plural / ICU i18n | Tiny `t()` only; revisit if more locales or complex plurals |
| [004](sdd/004-offline-mode.md) | Device verify subway offline + outbox replay | Agent cannot run `next dev`; spot-check PWA install, visit pages online, then airplane mode |
| [004](sdd/004-offline-mode.md) | Broader offline writes | Only visited / addSpend / togglePrep; notes & agenda edits stay online-only |
| [005](sdd/005-visual-tokens-dark-mode.md) | Device verify dark mode + FOUC | Flip Appearance system/light/dark on phone; check schedule sheet, modals, maps auto-Dark |
| [005](sdd/005-visual-tokens-dark-mode.md) | Clear map style → auto | No UI to reset explicit map style to auto; revisit if users need it |
| [007](sdd/007-map-feedback-a11y.md) / [009](sdd/009-compact-all-pages.md) | Unify list screens into the Schedule row style (design review item 3) | Done 2026-10-27 — SDD 009 |
| [008](sdd/008-compact-schedule-budget-map.md) | Device verify dense schedule/budget + map sheet | Agent cannot browser-check; confirm ≥8–9 stops / ≥9–10 expenses at 390×844 and map zoom/sheet/desktop panel |
| [013](sdd/013-daily-countdown-push.md) | Device verify morning countdown + prefs toggles | After deploy: dry-run `/api/cron/countdown?dry=1`; toggle prefs on phone; confirm tag replaces prior countdown |
| [013](sdd/013-daily-countdown-push.md) | Confirm next bump-version release notes | First post-013 tag should show grouped notes via `scripts/release-notes.sh` (not empty `--generate-notes`) |

## Unify list screens into the Schedule row style (design review item 3)

**Deferred from design review / SDD 007.** Make Places, Stays, Transit, and Expenses lists share the Schedule timeline/row language instead of card-heavy layouts.

**Done 2026-10-27 — SDD 009** (extended to overview, lists, days, prep, settings, offline, expense detail, and shared compact primitives).

### Intent

- One visual row system: time/date column, rail marker, one primary line + muted meta, quiet secondary actions.
- Move Edit / Delete into the “…” action sheet (same pattern as Schedule agenda rows), so the row itself stays scannable on a phone.
- Keep zh/en strings and existing offline/outbox behavior; do not invent a second list design system.

### Acceptance criteria

- [x] Places (`/places`), Stays (`/stays`), Transit (`/transit`), and Expenses timeline (`/budget`) rows match Schedule’s density and structure (date/time column + marker + primary + meta).
- [x] Destructive / edit actions live in a “…” sheet; no competing icon clusters on the row.
- [x] Visited / pending / over-budget still communicate with text or stamp, not colour alone.
- [x] ≥44px tap targets; reduced-motion respected for any new sheet transitions.
- [x] i18n: every new string in `src/lib/i18n` zh + en.

### Likely files

- `src/components/compact/*`, `places-list.tsx`, `stay-card.tsx`, `transit-card.tsx`, `spend-item-card.tsx` / `spend-timeline.tsx`, `day-agenda-board.tsx` (reference)
- List pages under `src/app/places`, `stays`, `transit`, `budget`, plus overview / days / prep / settings / `~offline`

### Effort

Roughly medium (1–2 focused sessions): shared row chrome + four list migrations + action-sheet wiring + a11y pass.

### Follow-ups not done tonight

- Prep swipe-to-delete (with Undo)

## Chosen — SDD 010 (2026-10-27)

| Status | Item | Notes |
| --- | --- | --- |
| Done | Schedule swipe actions | Right = visited + Undo; left = “…” sheet — [010](sdd/010-swipe-haptics-push-phrases.md) |
| Done | Haptics + micro-animations | `haptic(kind)` + 済/expense/toast motion — [010](sdd/010-swipe-haptics-push-phrases.md) |
| Done (run 2) | Web Push pre-trip / day-before | Cron + Settings + SW; Redis or `PUSH_SUBSCRIPTIONS` — [010](sdd/010-swipe-haptics-push-phrases.md) § item 3 |
| Done (run 3) | Japanese phrase cards `/phrases` | Show-to-staff + hotel cards + custom localStorage — [010](sdd/010-swipe-haptics-push-phrases.md) § item 4 |

### Push follow-ups (optional)

- Device verify iOS PWA Enable + Send test + live cron (agent cannot run Alex’s `next dev`)
- Multi-device: if several phones, prefer Redis over a single env JSON blob

## Backlog — not chosen (2026-10-27)

- Overview 当天倒数 — countdown to next stop with walk time; amber when late
- 全局搜索 — global search across places / stays / transit / expenses
- 大字模式 — temporary large-text mode for on-the-go readability
- 天气 — weather per day + rain hint on schedule
- 交通卡和车票 — JR Pass / Suica / shinkansen QR offline wallet
- 收据拍照 — receipt photo on expense, stored to Notion
- 分账结算 — settle-up page in RM for shared spend
- 旅行日记 — daily journal with photos + export recap
