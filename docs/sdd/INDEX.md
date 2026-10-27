# SDD index — Japan Trip

Living specs for this repo. Change specs stay `draft` until approved. Do not treat workspace `spec001.md` (Firebase, journal, boarding-pass UI) as current design.

| ID | Title | Status | Notes |
| --- | --- | --- | --- |
| [000](../architecture.md) | Architecture snapshot | current | How the app is built today |
| [001](001-schedule-visual-polish.md) | Schedule visual polish | implemented | Timeline grid, 24h times, quieter transit/gaps; shared DayAgendaBoard |
| [002](002-tests-ci-lint.md) | Tests + CI + clean lint | implemented | Vitest pure-logic tests, GitHub Actions CI, eslint zero |
| [003](003-unified-schedule-zh.md) | Unified Schedule + Chinese UI | implemented | Merge /today + /days/[id] into /schedule (Now/edit/pending); tiny zh/en i18n |
| [004](004-offline-mode.md) | Offline mode (SW + snapshot + outbox) | implemented | Serwist SW, itinerary snapshot v2, IndexedDB outbox for visited/spend/prep |
| [005](005-visual-tokens-dark-mode.md) | Visual tokens + dark mode | implemented | Semantic tokens, accent discipline, card chrome, hanko/kanji, theme cookie + dark maps |
| [006](006-quick-expense-forms.md) | Quick expense + expenses hero + form UX | implemented | Bottom-sheet quick spend, uncapped budget hero, labeled chip forms, PIN unlock sheet |
| [007](007-map-feedback-a11y.md) | Map page + feedback & a11y | implemented | Full-bleed map, Esri tiles, layers menu, sheet; toasts/Undo/restore; skeletons; SyncBadge banner; a11y |
| [008](008-compact-schedule-budget-map.md) | Compact schedule/budget + map fixes | implemented | Denser schedule/budget rows; map sheet anchor, zoom, fitBounds, day dots, desktop panel |
| [009](009-compact-all-pages.md) | Compact all pages (Schedule row language) | implemented | Shared compact primitives; densify overview/lists/places/stays/transit/days/prep/settings/offline/detail; fix /~offline #185 |
