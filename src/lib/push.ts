import webpush from "web-push";
import type { PushSubscriptionJSON } from "@/lib/push-store";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export function getVapidConfig(): VapidConfig | null {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
  const subject = process.env.VAPID_SUBJECT?.trim() || "";
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export function isPushConfigured(): boolean {
  return getVapidConfig() != null;
}

function applyVapid(config: VapidConfig) {
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
}

export type SendPushResult =
  | { ok: true }
  | { ok: false; statusCode?: number; gone: boolean; error: string };

export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  payload: PushPayload,
): Promise<SendPushResult> {
  const config = getVapidConfig();
  if (!config) {
    return { ok: false, gone: false, error: "VAPID not configured" };
  }
  applyVapid(config);
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        expirationTime: subscription.expirationTime ?? undefined,
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/",
        tag: payload.tag,
      }),
      {
        TTL: 60 * 60 * 12,
        urgency: "normal",
      },
    );
    return { ok: true };
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : undefined;
    const gone = statusCode === 404 || statusCode === 410;
    const message =
      error instanceof Error ? error.message : "Push send failed";
    return { ok: false, statusCode, gone, error: message };
  }
}

export async function sendPushToAll(
  subscriptions: PushSubscriptionJSON[],
  payload: PushPayload,
): Promise<{
  sent: number;
  failed: number;
  goneEndpoints: string[];
}> {
  let sent = 0;
  let failed = 0;
  const goneEndpoints: string[] = [];
  for (const sub of subscriptions) {
    const result = await sendPushNotification(sub, payload);
    if (result.ok) {
      sent += 1;
      continue;
    }
    failed += 1;
    if (result.gone) goneEndpoints.push(sub.endpoint);
  }
  return { sent, failed, goneEndpoints };
}
