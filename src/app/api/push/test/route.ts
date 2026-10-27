import { getEditorSession } from "@/lib/edit-session";
import { isPushConfigured, sendPushToAll } from "@/lib/push";
import {
  isPushStoreConfigured,
  listSubscriptions,
  removeSubscriptionsByEndpoints,
} from "@/lib/push-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getEditorSession();
  if (!session.canEdit) {
    return Response.json(
      { error: "Unlock editing in Settings first" },
      { status: 401 },
    );
  }
  if (!isPushConfigured()) {
    return Response.json(
      {
        error:
          "Push is not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.",
      },
      { status: 503 },
    );
  }
  if (!isPushStoreConfigured()) {
    return Response.json(
      {
        error:
          "No push subscriptions stored. Enable reminders after configuring Upstash Redis or PUSH_SUBSCRIPTIONS.",
      },
      { status: 503 },
    );
  }

  const subscriptions = await listSubscriptions();
  if (subscriptions.length === 0) {
    return Response.json(
      { error: "No push subscriptions yet. Enable trip reminders on a device first." },
      { status: 404 },
    );
  }

  const result = await sendPushToAll(subscriptions, {
    title: "Japan Trip",
    body: "Test push — 行前提醒测试",
    url: "/settings",
    tag: "push-test",
  });
  if (result.goneEndpoints.length) {
    await removeSubscriptionsByEndpoints(result.goneEndpoints);
  }

  return Response.json({
    ok: true,
    subscribers: subscriptions.length,
    sent: result.sent,
    failed: result.failed,
    removed: result.goneEndpoints.length,
  });
}
