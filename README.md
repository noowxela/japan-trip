# Japan Trip

Mobile-first itinerary app. Notion is the source of truth.

Hub page: [Japan Trip](https://app.notion.com/p/Japan-Trip-3bdb5fd4cdf78145a599cd5e3c3f2982)

## Setup

1. Create an internal integration at [notion.so/my-integrations](https://www.notion.so/my-integrations).
2. Copy `.env.example` to `.env.local` and set `NOTION_TOKEN`.
3. Share a parent page with the integration.
4. Create databases, then add v2 columns (Start/map/Spend) and the Editors PIN list:

```bash
npm run setup:notion
npm run migrate:v2
```

Add a row in the **Editors** Notion database (Name + PIN) for each person who should edit. Everyone else can view without unlocking.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Home** — city hop, today/next, visit progress, estimate vs actual
- **Day** — timed agenda (places + transit)
- **Map** — city path + geocoded pins
- **Spend** — JPY estimates and actuals

## What lives where

- **Notion:** long notes, bookings, photos, bulk edits
- **This app:** trip flow, mark visited, quick add, spend rollup
