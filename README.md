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

On this computer, open [http://localhost:3000](http://localhost:3000).

On a phone, use the `Network` URL printed when `npm run dev` starts. The phone and the computer must be on the same Wi-Fi. `localhost` on the phone is the phone, so this does not work there:

```text
http://localhost:3000/schedule
```

Use the printed address instead, for example:

```text
http://192.168.1.7:3000/schedule
```

That number changes when the computer rejoins Wi-Fi. Stop the server and run `npm run dev` again, then use the new `Network` line. If the phone cannot connect at all, allow Node in System Settings → Network → Firewall.

- **Home** — city hop, today/next, visit progress, estimate vs actual
- **Day** — timed agenda (places + transit)
- **Map** — city path + geocoded pins
- **Spend** — JPY estimates and actuals

## What lives where

- **Notion:** long notes, bookings, photos, bulk edits
- **This app:** trip flow, mark visited, quick add, spend rollup
