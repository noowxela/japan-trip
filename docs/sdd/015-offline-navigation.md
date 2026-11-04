# SDD: Offline navigation (fallback escape, RSC cache keys, staleness badge)

- **Repo:** `o000o_active/japan_trip_app`
- **Status:** `implemented`
- **Date:** 2026-11-04
- **Related:** [004 offline mode](004-offline-mode.md), [014 loading skeletons](014-loading-skeletons.md), [risks](../risks.md)

## 1. Context / current architecture

The PWA uses a Serwist SW (`src/app/sw.ts`): document navigations go NetworkFirst into the `pages` cache, everything else falls through to `@serwist/turbopack`'s `defaultCache`, which caches RSC (flight) requests NetworkFirst per full URL in `pages-rsc-prefetch` / `pages-rsc`. Uncached document navigations get the precached `/~offline` page (client component: saved itinerary from `trip-cache`, next/link, `useRouter`). `SyncBadge` shows a top banner when `navigator.onLine` is false or a page raised `CacheFallbackSignal`.

## 2. Problem and non-goals

**Problem:** (Alex 2026-11-04, "do all".) Measured offline on a local prod build (Chromium, `context.setOffline(true)`):

1. **Stuck after the fallback.** After `/~offline` is served for an unvisited route (e.g. a hard load of `/places`), its HTML/RSC boots the router for `/~offline` at another URL. Tapping `/` in the bottom nav did nothing (URL stayed `/places`); live this showed as `Router action dispatched before initialization` and needed one or two hard reloads.
2. **Every offline tap was a full reload.** Next appends `?_rsc=<hash>` where the hash covers the router headers (state tree, prefetch flags), so the cached RSC URL almost never equals the one requested offline. Each soft tap logged `Failed to fetch RSC payload … Falling back to browser navigation`. Pages opened only by a full load had no RSC entry at all.
3. **Staleness unclear.** The offline banner said "showing cached data" without a time; a cache answer after a network timeout while "online" showed nothing.

**Non-goals:** making unvisited routes work offline (fallback stays); restyling pages; offline writes beyond SDD 004; new deps; Notion / `.env*` / `notion/`.

## 3. Questions asked and answers

| Question | Answer |
| --- | --- |
| Scope? | All three fixes ("do all"). |
| Keep NetworkFirst online? | Yes — online always prefers the network. |
| Push? | No; local commit only until Alex says "push". |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:**

1. **Fallback escape** (`src/app/~offline/page.tsx`, `src/lib/offline-nav.ts`): the fallback page installs a capture-phase click listener that turns any same-origin, unmodified link click (including the shared `BottomNav` next/link) into `location.assign(href)`; its own link is a plain `<a>`, Retry is `location.reload()`. No `useRouter`. Pure `hardNavigationHref()` is unit-tested.
2. **RSC cache keys** (`src/app/sw.ts`, `src/lib/sw-rsc-key.ts`): an explicit RSC route before `defaultCache` (same cache names, NetworkFirst, 4 s timeout, `ignoreVary`) with a `cacheKeyWillBeUsed` plugin: key = path + query without `_rsc` + `__sw_rsc=<kind>|d<depth>`. `kind` is `full`, `prefetch` or `seg:<segment>` (payload shapes differ, never mixed). `depth` is the shallowest `"refetch"` marker in `Next-Router-State-Tree` (Next 16 sends the target tree; the server renders from there). On an offline miss, `cachedResponseWillBeUsed` also tries shallower `full` keys (a payload rendered from higher up is a superset).
3. **Warm on full loads:** after an online document response updates the `pages` cache, the SW fetches the page's root RSC payload (`RSC: 1`, no tree → `full|d0`) unless one younger than 30 min is cached (`shouldWarmRsc`). So a page opened only by a full load is also reachable by an offline soft tap.
4. **Staleness badge** (`src/components/sync-badge.tsx`, `src/lib/offline-status.ts`): NetworkFirst routes post `kc:served-from-cache` (`url`, cached `Date`) to the page when they answer from cache. The existing banner now reads `离线 · 显示 {time} 的缓存数据` / `Offline · showing data from {time}` (time = cached response Date, else trip snapshot `savedAt`), and `网络较慢 · 显示 {time} 的缓存数据` when online but the current page came from cache. Same component, same styling.

**Pros:** Visited pages (soft or hard) navigate offline without reloading the JS context; leaving the fallback always works; no new deps; online path unchanged (network first, the extra warm fetch is rate-limited).

**Cons / risks:** The warm fetch is one extra server render (and Notion reads) per page per 30 min on full loads. Leaving the fallback is always a full reload (by design). Reusing a shallower payload relies on Next accepting a from-root payload for a deeper refetch (verified for top-level routes; nested `/budget/[id]` not browser-checked). The time shown is Tokyo time like the rest of the offline UI.

**Rejected alternatives:**

| Alternative | Why not |
| --- | --- |
| Serve prefetch payloads for full navigations | Next 16 prefetches are per-segment / partial (`/_tree`, loading boundaries); rendering them as a page shows a skeleton forever or breaks the tree. |
| Ignore query + Vary entirely (one key per path) | Mixes prefetch, segment and full payloads → corrupt router state. |
| Serve `/~offline`'s RSC payload for RSC misses | Keeps the router "alive" but renders the fallback tree under the wrong segment; brittle across Next versions. |
| Rewrite the fallback as static HTML outside the root layout | Loses i18n, theme and the saved itinerary view; the click-capture fix gives the same escape with a tiny diff. |
| `navigator.onLine` only for staleness | Misses the "online but timed out → cache" case. |

**Picture:**

```text
offline tap /schedule
 before: RSC ?_rsc=AAA  -> cache miss (stored ?_rsc=BBB) -> full reload -> HTML from cache
 after : RSC key /schedule?__sw_rsc=full|d1 -> miss -> full|d0 (warmed) -> soft nav ✓

fallback (/places) -> tap /
 before: next/link on router booted for /~offline -> URL stuck
 after : capture click -> location.assign("/") -> cached HTML ✓
```

## 5. Acceptance criteria and verification

- [x] Offline soft nav to `/schedule` and `/budget` shows data with no full reload, both after online soft visits and after hard-load-only visits
- [x] Offline tap to unvisited `/map` / `/settings` shows the fallback; a tap back to `/` works with no manual reload
- [x] Hard load of unvisited `/places` offline → tap `/` → `/schedule` works (BUG 1 repro; before: URL stuck on `/places`)
- [x] Offline banner shows `离线 · 显示 HH:MM 的缓存数据`; no banner online
- [x] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`

**Verification:** Playwright + Chromium against `npm start -p 3100`, 390×844, `zh-CN`, `context.setOffline(true)`; a `window.__kc` marker proves soft vs full navigation. Screenshots in `/tmp/kc-offline-fix/{before,before-hard,after-soft,after-hard}/`.

## 6. Status history

- 2026-11-04 — implemented (local commit, not pushed)
