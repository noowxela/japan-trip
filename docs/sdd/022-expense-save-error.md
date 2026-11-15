# SDD: Expense save no longer dies on Notion `ERROR 1112746976`

- **Repo:** `o000o_active/japan_trip_app`
- **Status:** `implemented`
- **Date:** 2026-11-06
- **Related:** [architecture](../architecture.md), [006 quick expense](006-quick-expense-forms.md), [004 offline](004-offline-mode.md)

## 1. Context / current architecture

Add expense is the quick sheet (`quick-expense-sheet.tsx` → `OutboxProvider.submitSpend` → `runAddSpend` → `addSpend`). The full spend form (`spend-form.tsx` → `ActionForm`) uses the same `submitSpend` for create and `updateSpend` for edit. Both build `Start` through `startProp`. Quick add always sends a Tokyo time (`tokyoNowTime` → `+09:00`). A thrown server action inside `startTransition` is not caught. The sheet sets `document.body.style.overflow = hidden`, which disables iOS pull-to-refresh while it is open.

## 2. Problem and non-goals

**Problem:** On the live PWA, Save on add expense shows `ERROR 1112746976` and then the page cannot reload. The same incident: the write throws, so there is no success toast and the sheet/router stay stuck.

**Cause:** Notion date writes must send either an offset timestamp or a naive time plus `time_zone`, never both ([page property values](https://developers.notion.com/reference/page-property-values)). `startProp` sent `2026-11-06T14:32:00+09:00` and `time_zone: "Asia/Tokyo"`. Notion answers that invalid body with an internal `ERROR <id>` (`ERROR 1112746976` on this workspace). `withSplitWithFallback` only swallows a validation error that mentions `Split with`, so the internal error was rethrown. `runAddSpend` rethrew anything that was not a network failure. The rejection escaped the save transition, so the quick sheet (root layout) could crash without an error boundary, body scroll stayed locked, and iOS had no working reload.

**Non-goals:** Hand-editing Notion trip rows. Changing the version bump workflow. Reworking the service worker. Queuing this class of error for automatic replay (that would call Notion again every 30s).

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| Fix the payload or only surface the code? | Both. The bug report asked for a real save when we can, and a clear message when we cannot. |
| Should a Notion internal error be queued offline? | No. Offline/network failures still queue. `ERROR <id>` is a rejected write, shown once, not replayed in a loop. |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:**

1. `notionStartProperty`: if `Start` already has `Z` or a numeric offset, omit `time_zone`. Add `Asia/Tokyo` only for a time that has no offset.
2. `addSpend` / `updateSpend` catch Notion failures and return `action.spendNotionCode` (includes `ERROR 1112746976`) or `action.spendSaveFailed`.
3. `runAddSpend`, the quick sheet, and `ActionForm` catch a thrown save and toast it. They do not rethrow, so the transition ends and the sheet stays usable.
4. `global-error.tsx` offers a full `location.reload()` if a later crash still replaces the root tree. `reset()` alone does not unlock an iOS PWA.

**Pros:** Quick add and the full form share the date helper and the error path. A bad write cannot wedge reload. The code stays visible inside a sentence that says nothing was saved.

**Cons / risks:** Other timed writes (places, transit, stays) use the same helper, so they also stop sending both forms. That matches the Notion contract. A workspace that relied on the illegal combination would already be failing.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Only toast the raw code | Save would keep failing on every timed expense |
| Queue the internal error in the outbox | Replay every 30s would hammer Notion with the same rejected body |
| Treat it as a service-worker bug | Reload fails only after this submit, while the sheet holds the scroll lock |

## 5. Acceptance criteria and verification

- [x] Timed spend `Start` is an offset timestamp without `time_zone`
- [x] `ERROR 1112746976` becomes a toast/inline error that says the expense was not saved
- [x] Quick sheet and full spend form both catch a thrown save
- [x] Network failures still queue
- [x] `npm test`, `npm run lint`, `npm run typecheck`

## 6. Status history

| Date | Status | Note |
| --- | --- | --- |
| 2026-11-06 | implemented | Live trip bug report is the approval to fix and open the PR |
