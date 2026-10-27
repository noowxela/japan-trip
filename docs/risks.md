# Open risks

| Risk | Severity | Notes |
| --- | --- | --- |
| CI does not exercise Notion reads/writes | medium | Unit tests are pure-logic only; env/token failures still only show at runtime |
| Offline schedule cache is same-tab only for storage events | low | `ScheduleOfflineFallback` / `/~offline` use `storage` events; same-tab `writeTripCache` may not notify other subscribers until refresh/interval |
| Stale SW HTML/RSC until revisit | medium | NetworkFirst pages cache; force-dynamic shells need a prior online visit |
| Outbox stalled without editor cookie | medium | Replay keeps entries and surfaces「需要编辑权限」 until unlock |
| Soft editor PIN security | medium | See architecture; unchanged by 002 |
| Theme FOUC if script blocked | low | Inline boot script in root layout; cookie covers light/dark; system relies on script |
| Map style sticky after dark auto | low | First explicit pick persists forever; no reset-to-auto control yet (005) |
| Esri Canvas maxZoom 16 | low | Light/Dark Canvas layers stop at z16; Soft/Streets/Sat go higher (007) |
| Delete Undo window | low | Toast ~6s; restore needs editor cookie; navigating away mid-toast still works if toast mounted in root |
