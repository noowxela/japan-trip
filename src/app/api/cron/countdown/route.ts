import { computeCountdown } from "@/lib/countdown";
import { authorizeCron } from "@/lib/cron-auth";
import { notionReady } from "@/lib/notion";
import { isPushConfigured, sendPushToAll } from "@/lib/push";
import {
  filterByPref,
  isPushStoreConfigured,
  listSubscriptions,
  removeSubscriptionsByEndpoints,
} from "@/lib/push-store";
import { getDays, getPlaces, getPrep, getTransit } from "@/lib/trip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      message: "Notion is not configured; nothing to send.",
      countdown: null,
    });
  }

  const [days, places, transit, prep] = await Promise.all([
    getDays(),
    getPlaces(),
    getTransit(),
    getPrep(),
  ]);

  const countdown = computeCountdown(
    { days, places, transit, prep },
    now,
    { locale: "zh", timeZone: "Asia/Kuala_Lumpur" },
  );

  if (dry) {
    return Response.json({
      ok: true,
      dry: true,
      now: now.toISOString(),
      countdown,
    });
  }

  if (!countdown) {
    return Response.json({
      ok: true,
      dry: false,
      countdown: null,
      sent: 0,
      failed: 0,
      subscribers: 0,
      message: "No countdown for this day (trip ended or no dated days).",
    });
  }

  if (!isPushConfigured()) {
    return Response.json(
      {
        error:
          "Push is not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.",
        countdown,
      },
      { status: 503 },
    );
  }
  if (!isPushStoreConfigured()) {
    return Response.json(
      {
        error: "No push subscription store configured.",
        countdown,
      },
      { status: 503 },
    );
  }

  const all = await listSubscriptions();
  const subscriptions = filterByPref(all, "countdown");
  if (subscriptions.length === 0) {
    return Response.json({
      ok: true,
      dry: false,
      countdown: {
        id: countdown.id,
        title: countdown.title,
        tag: countdown.tag,
      },
      sent: 0,
      failed: 0,
      subscribers: 0,
      totalSubscribers: all.length,
      message: "No subscribers with countdown enabled.",
    });
  }

  const result = await sendPushToAll(subscriptions, {
    title: countdown.title,
    body: countdown.body,
    url: countdown.url,
    tag: countdown.tag,
  });
  const removed = await removeSubscriptionsByEndpoints(result.goneEndpoints);

  return Response.json({
    ok: true,
    dry: false,
    countdown: {
      id: countdown.id,
      title: countdown.title,
      tag: countdown.tag,
    },
    subscribers: subscriptions.length,
    totalSubscribers: all.length,
    sent: result.sent,
    failed: result.failed,
    removed,
  });
}
