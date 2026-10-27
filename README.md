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

## Push reminders setup

Two daily Web Push channels (Subscriptions are **not** stored in Notion):

| Cron | Schedule | Intent |
| --- | --- | --- |
| `/api/cron/reminders` | `0 11 * * *` (**11:00 UTC** = 20:00 JST) | Evening-before: tomorrow’s transit, hotel check-in, unchecked Prep (3 and 1 days before), optional “departure tomorrow” |
| `/api/cron/countdown` | `0 1 * * *` (**01:00 UTC** ≈ **09:00 MYT** / 10:00 JST) | Morning countdown: days left / departure day / on-trip day N |

**Vercel Hobby** (checked 2026-10-28): up to 100 cron jobs/project; each at most once per day; **hour** precision — `0 1 * * *` may fire any time **01:00–01:59 UTC** (= **09:00–09:59 MYT**).

Per-subscription prefs (`reminders` / `countdown`, both default **on** when missing) live on the Upstash row. Legacy production subscriptions without `prefs` keep receiving both. Env-fallback `PUSH_SUBSCRIPTIONS` may include `prefs` but is read-only (Settings switches disabled).

1. Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

2. Set these in Vercel **Production** (and `.env.local` for local). Do not commit secrets.

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key (client + server) |
| `VAPID_PRIVATE_KEY` | Private key (server only) |
| `VAPID_SUBJECT` | e.g. `mailto:you@example.com` |
| `CRON_SECRET` | e.g. `openssl rand -hex 32` (Vercel Cron sends `Authorization: Bearer …`) |
| `KV_REST_API_URL` | Upstash Redis REST URL (preferred store) |
| `KV_REST_API_TOKEN` | Upstash Redis REST token |
| `UPSTASH_REDIS_REST_URL` | Alt name for the same URL (either pair works) |
| `UPSTASH_REDIS_REST_TOKEN` | Alt name for the same token |
| `PUSH_SUBSCRIPTIONS` | Fallback when no Redis: JSON **array** of PushSubscription JSON objects (optional `prefs`) |

3. Subscription storage (pick one):

- **Preferred:** add **Upstash Redis** from the Vercel Marketplace (`KV_REST_API_URL` + `KV_REST_API_TOKEN`, or the `UPSTASH_REDIS_REST_*` aliases).
- **Fallback:** no Redis — enable reminders on a device, tap **Copy subscription JSON** in Settings, paste into `PUSH_SUBSCRIPTIONS` as a JSON **array**, redeploy.

4. Redeploy. On iPhone: Safari → Share → **Add to Home Screen**, open from the icon, unlock editing in Settings, tap **Enable**, then **Send test**. When subscribed, toggle **Evening reminders** / **Daily countdown** (writable store only).

5. Dry-run the crons (no sends). Optional `now` (ISO string) is honored **only** with `dry=1`; real sends always use wall-clock time.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<your-app>/api/cron/reminders?dry=1"

curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<your-app>/api/cron/reminders?dry=1&now=2026-10-27T11:00:00.000Z"

curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<your-app>/api/cron/countdown?dry=1"

curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<your-app>/api/cron/countdown?dry=1&now=2026-10-24T01:00:00.000Z"
```

Architecture notes: [docs/architecture.md](docs/architecture.md). Specs: [010](docs/sdd/010-swipe-haptics-push-phrases.md), [013](docs/sdd/013-daily-countdown-push.md).
