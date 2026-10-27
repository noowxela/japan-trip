import { timingSafeEqual } from "node:crypto";
import { notionReady } from "@/lib/notion";
import { isPushConfigured, sendPushToAll } from "@/lib/push";
import {
  isPushStoreConfigured,
  listSubscriptions,
  removeSubscriptionsByEndpoints,
} from "@/lib/push-store";
import { computeReminders } from "@/lib/reminders";
import { getDays, getPrep, getStays, getTransit } from "@/lib/trip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dry = url.searchParams.get("dry") === "1";

  // Optional ISO `now` is dry-run only — real sends always use wall clock.
  let now = new Date();
  if (dry) {
    const nowParam = url.searchParams.get("now");
    if (nowParam) {
      const parsed = new Date(nowParam);
      if (!Number.isNaN(parsed.getTime())) {
        now = parsed;
      }
    }
  }

  if (!notionReady()) {
    return Response.json({
      ok: true,
      dry,
      now: dry ? now.toISOString() : undefined,
      reminders: [],
      message: "Notion is not configured; nothing to remind.",
    });
  }

  const [days, transit, stays, prep] = await Promise.all([
    getDays(),
    getTransit(),
    getStays(),
    getPrep(),
  ]);

  const reminders = computeReminders(
    { days, transit, stays, prep },
    now,
    { locale: "zh" },
  );

  if (dry) {
    return Response.json({
      ok: true,
      dry: true,
      now: now.toISOString(),
      count: reminders.length,
      reminders,
    });
  }

  if (!isPushConfigured()) {
    return Response.json(
      {
        error:
          "Push is not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.",
        reminders,
      },
      { status: 503 },
    );
  }
  if (!isPushStoreConfigured()) {
    return Response.json(
      {
        error: "No push subscription store configured.",
        reminders,
      },
      { status: 503 },
    );
  }

  const subscriptions = await listSubscriptions();
  if (subscriptions.length === 0) {
    return Response.json({
      ok: true,
      dry: false,
      count: reminders.length,
      reminders,
      sent: 0,
      failed: 0,
      subscribers: 0,
      message: "No subscribers.",
    });
  }

  let sent = 0;
  let failed = 0;
  const gone = new Set<string>();

  for (const reminder of reminders) {
    const result = await sendPushToAll(subscriptions, {
      title: reminder.title,
      body: reminder.body,
      url: reminder.url,
      tag: reminder.tag,
    });
    sent += result.sent;
    failed += result.failed;
    for (const endpoint of result.goneEndpoints) gone.add(endpoint);
  }

  const removed = await removeSubscriptionsByEndpoints([...gone]);

  return Response.json({
    ok: true,
    dry: false,
    count: reminders.length,
    reminders: reminders.map((r) => ({ id: r.id, title: r.title, tag: r.tag })),
    subscribers: subscriptions.length,
    sent,
    failed,
    removed,
  });
}
