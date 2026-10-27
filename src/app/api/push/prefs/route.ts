import { getEditorSession } from "@/lib/edit-session";
import { isPushConfigured } from "@/lib/push";
import {
  getPrefs,
  isPushStoreWritable,
  updatePrefs,
  type PushPrefs,
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

export async function GET(request: Request) {
  const denied = await requireEditorResponse();
  if (denied) return denied;
  const missing = notConfiguredResponse();
  if (missing) return missing;

  const endpoint = new URL(request.url).searchParams.get("endpoint")?.trim() ?? "";
  const result = await getPrefs(endpoint);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({
    ok: true,
    prefs: result.prefs,
    writable: isPushStoreWritable(),
  });
}

export async function PATCH(request: Request) {
  const denied = await requireEditorResponse();
  if (denied) return denied;
  const missing = notConfiguredResponse();
  if (missing) return missing;

  if (!isPushStoreWritable()) {
    return Response.json(
      {
        error:
          "Cannot update prefs on read-only PUSH_SUBSCRIPTIONS env. Configure Upstash Redis.",
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

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const endpoint = typeof record.endpoint === "string" ? record.endpoint : "";
  const prefsRaw = record.prefs;
  if (!prefsRaw || typeof prefsRaw !== "object") {
    return Response.json({ error: "Missing prefs object" }, { status: 400 });
  }
  const prefsRecord = prefsRaw as Record<string, unknown>;
  const partial: Partial<PushPrefs> = {};
  if (typeof prefsRecord.reminders === "boolean") {
    partial.reminders = prefsRecord.reminders;
  }
  if (typeof prefsRecord.countdown === "boolean") {
    partial.countdown = prefsRecord.countdown;
  }
  if (
    partial.reminders === undefined &&
    partial.countdown === undefined
  ) {
    return Response.json(
      { error: "prefs must include reminders and/or countdown boolean" },
      { status: 400 },
    );
  }

  const result = await updatePrefs(endpoint, partial);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true, prefs: result.prefs });
}
