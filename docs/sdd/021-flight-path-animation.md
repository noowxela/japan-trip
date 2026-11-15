# SDD: Flight path plane on the day list and map

- **Repo:** `o000o_active/japan_trip_app`
- **Status:** `implemented`
- **Date:** 2026-11-06
- **Related:** [001 schedule visual polish](001-schedule-visual-polish.md), [008 compact schedule/map](008-compact-schedule-budget-map.md)

## 1. Context / current architecture

`/schedule` is a day map (`day-map.tsx`) over a bottom sheet. The sheet list is `DayAgendaBoard`: a time column, a timeline rail, then the row. A flight is one transit row (`chip: "Flight"`, `detail` `"from → to"`). Airports are separate place rows with coordinates (`Kansai International Airport`, `reach KLIA Malaysia`). `buildAgenda` did not keep `from` / `to` on the row. Map pins come from places only, so Day 1 (KLIA → Kansai) has a Kansai pin and no KLIA pin. `FlightPlaneIcon` is the badge beside the Flight label. Version bumps on push to `main` (`.github/workflows/bump-version.yml`); this change does not edit `package.json`.

## 2. Problem and non-goals

**Problem:** On a flight day the departure row and the arrival airport sit in the same list, and the map has both ends (or can resolve them), but nothing shows the plane moving from one to the other.

**Non-goals:** Notion schema or copy changes; trains and buses; changing `fitBounds`, pin focus, `flyTo`, popups, or sheet snaps; a second plane on the Flight badge.

## 3. Questions asked and answers

The task spec fixed the open choices; live Day 1 / return-day rows confirmed the pairing.

| Question | Answer |
| --- | --- |
| What is a pair? | A Flight row and the later place whose name matches the destination (last token, plus KIX ↔ Kansai and KLIA ↔ KUL). If no place, the next flight segment whose origin matches. |
| What if KLIA is not a pin? | Use the existing landmark lookup for that end. Do not add a pin and do not refit the map. A hidden matched pin suppresses the arc. |

## 4. Proposed approach, pros / cons, rejected alternatives

**Approach:**

1. Copy `from` / `to` onto transit agenda rows in `buildAgenda`.
2. Pure pairing in `src/lib/flight-path.ts` (`flightListLinks`, `flightMapArcs`, great-circle samples, viewport clip).
3. **List:** a pointer-events-none overlay beside the `<ol>` draws a soft dashed arc in the rail gutter and moves the existing plane glyph along it with CSS `offset-path`. `prefers-reduced-motion` pins the plane on the arc.
4. **Map:** a non-interactive Leaflet polyline + divIcon. The loop follows the part of the route currently on screen, so a city zoom shows the plane arriving at Kansai instead of refitting to Malaysia.

**Pros:** No new dependencies. Day 1 and the return day both pair from the real rows. Focus, the now-card, and the badge animation stay as they are. Reduced motion is CSS on the list and a one-shot pose on the map.

**Cons / risks:** Name matching can miss an airport whose label shares no token with the flight's `to`. The map plane is decorative and does not open the pin popup.

**Rejected alternatives:**

- Treating every transit mode the same way (the request is flights only).
- Adding KLIA to the day's pins so `fitBounds` includes Malaysia (the Osaka day map would zoom out).
- Putting the SVG inside the `<ol>` (browsers hoist non-`li` children).

## 5. Verification

- `src/lib/flight-path.test.ts` covers Day 1, the return flight, KIX, consecutive segments, trains, hidden pins, and the KLIA landmark.
- Browser: schedule day with the KLIA → Kansai pair, list arc + plane, map plane into Kansai, tap a place pin (focus / popup still work), reduced-motion shows no loop.
