import { getEditorSession } from "@/lib/edit-session";
import { isPushConfigured } from "@/lib/push";
import {
  addSubscription,
  isPushStoreWritable,
  removeSubscription,
} from "@/lib/push-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireEditorResponse() {
  const session = await getEditorSession();
  if (!session.canEdit) {
    return Response.json(
      { error: "Unlock editing in Settings first" },
      { status: 401 },
    );
  }
  return null;
}

function notConfiguredResponse() {
  if (!isPushConfigured()) {
    return Response.json(
      {
        error:
          "Push is not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.",
      },
      { status: 503 },
    );
  }
  return null;
}

export async function POST(request: Request) {
  const denied = await requireEditorResponse();
  if (denied) return denied;
  const missing = notConfiguredResponse();
  if (missing) return missing;
  if (!isPushStoreWritable()) {
    return Response.json(
      {
        error:
          "No writable push store. Add Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN), or use “Copy subscription JSON” and set PUSH_SUBSCRIPTIONS.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await addSubscription(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true, endpoint: result.subscription.endpoint });
}

export async function DELETE(request: Request) {
  const denied = await requireEditorResponse();
  if (denied) return denied;
  const missing = notConfiguredResponse();
  if (missing) return missing;

  let endpoint = "";
  try {
    const body = (await request.json()) as { endpoint?: unknown };
    endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await removeSubscription(endpoint);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true });
}
