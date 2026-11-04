# Open risks

| Risk | Severity | Notes |
| --- | --- | --- |
| CI does not exercise Notion reads/writes | medium | Unit tests are pure-logic only; env/token failures still only show at runtime |
| Offline schedule cache is same-tab only for storage events | low | `ScheduleOfflineFallback` / `/~offline` use `storage` events; same-tab `writeTripCache` may not notify other subscribers until refresh/interval |
| Stale SW HTML/RSC until revisit | medium | NetworkFirst pages cache; force-dynamic shells need a prior online visit. SDD 015: offline soft taps now hit the RSC cache and the banner shows the data time |
| SW RSC cache keys depend on Next internals | medium | SDD 015 keys on `Next-Router-State-Tree` refetch depth and strips `_rsc`; a Next upgrade changing these headers silently brings back offline full reloads — re-run the offline Playwright check after upgrades |
| RSC warm fetch on full loads | low | One extra server render (Notion reads) per page per 30 min (SDD 015) |
| Outbox stalled without editor cookie | medium | Replay keeps entries and surfaces「需要编辑权限」 until unlock |
| Soft editor PIN security | medium | See architecture; unchanged by 002 |
| Theme FOUC if script blocked | low | Inline boot script in root layout; cookie covers light/dark; system relies on script |
| Map style sticky after dark auto | low | First explicit pick persists forever; no reset-to-auto control yet (005) |
| Esri Canvas maxZoom 16 | low | Light/Dark Canvas layers stop at z16; Soft/Streets/Sat go higher (007) |
| Delete Undo window | low | Toast ~6s; restore needs editor cookie; navigating away mid-toast still works if toast mounted in root |
| Hobby cron hour precision | low | Countdown `0 1 * * *` may fire 01:00–01:59 UTC (09:00–09:59 MYT); documented in README + SDD 013 |
| Env-fallback push prefs | low | `PUSH_SUBSCRIPTIONS` cannot PATCH prefs; Settings disables switches with hint |
| Open-Meteo dependency | low | Free non-commercial tier, 3 s timeout; on failure Schedule shows no weather and the evening push skips the rain line silently |
| Weather is city-centre only | low | Day trips (Nara, Kobe) get the base city's forecast; multi-city days use the first listed city |
| Settle-up uses today's FX for Yen | low | Transfer amounts drift a little day to day; the 分账 tab shows rate + date |
| `Split with` missing in Notion | low | Writes retry without it (warns in logs), so splits silently fall back to everyone until `npm run migrate:v2` runs |
