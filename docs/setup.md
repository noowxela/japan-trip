# Setup

Full install, Notion bootstrap, run, and push setup live in the [README](../README.md). This file tracks steps that are easy to miss.

## Before deploying a schema change

New Notion columns ship through `notion/scripts/migrate-v2.mjs`, which only adds missing columns:

```bash
npm run migrate:v2
```

Run it against the live workspace (uses `NOTION_TOKEN` from `.env.local`) before deploying code that writes the column. Current columns that need it:

| Column | Database | Since |
| --- | --- | --- |
| `Split with` (multi-select) | Spend | [SDD 016](sdd/016-settle-up-split.md) — added to live Notion 2026-11-04 |
| `Ride-hailing` (Mode select) | Transit | [SDD 023](sdd/023-schedule-spend-links.md) — `npm run migrate:transit-ride-hailing` |
| `Train` (Mode select) | Transit | `npm run migrate:transit-train` |
| `Place` (relation) | Spend → Places | [SDD 023](sdd/023-schedule-spend-links.md) — `npm run migrate:spend-place` |
| `Transit` (relation) | Spend → Transit | [SDD 023](sdd/023-schedule-spend-links.md) — `npm run migrate:spend-transit` |
| `Each Paid Own` (checkbox) | Spend | `npm run migrate:spend-each-paid-own` — Amount is one person's fare; totals count × participants |

## External services (no keys)

| Service | Used for | Notes |
| --- | --- | --- |
| Frankfurter / open.er-api | MYR→JPY | Fallback rate `JPY_PER_RM` |
| Open-Meteo | Daily weather on Schedule + evening rain push | [SDD 017](sdd/017-weather-rain-hint.md); free non-commercial tier |
| Nominatim | Geocoding | Landmark table first |
