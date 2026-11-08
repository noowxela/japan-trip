import { updateTag } from "next/cache";
import { tokyoNowTime, tokyoToday, tokyoWallDateTime } from "@/lib/format";
import { ds, getNotion, notionReady, textProp, titleProp } from "@/lib/notion";
import { notionStartProperty } from "@/lib/notion-date";
import { authorizeSpendIngest } from "@/lib/spend-ingest-auth";
import {
  INGEST_DEDUPE_WINDOW_MS,
  parseIngestBody,
  planSpendIngest,
  todayDayId,
} from "@/lib/spend-ingest";
import {
  findIngestDuplicate,
  getDays,
  getEditorNames,
  TRIP_TAGS,
} from "@/lib/trip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const recentByClientId = new Map<string, { id: string; at: number }>();

function requestOrigin(request: Request): string {
  return new URL(request.url).origin;
}

function editUrlFor(request: Request, id: string): string {
  return `${requestOrigin(request)}/budget/${id}?focus=category`;
}

function rememberClientId(clientId: string, id: string) {
  const now = Date.now();
  recentByClientId.set(clientId, { id, at: now });
  for (const [key, value] of recentByClientId) {
    if (now - value.at > INGEST_DEDUPE_WINDOW_MS) {
      recentByClientId.delete(key);
    }
  }
}

function recalledClientId(clientId: string): string | null {
  const hit = recentByClientId.get(clientId);
  if (!hit) return null;
  if (Date.now() - hit.at > INGEST_DEDUPE_WINDOW_MS) {
    recentByClientId.delete(clientId);
    return null;
  }
  return hit.id;
}

export async function POST(request: Request) {
  if (!authorizeSpendIngest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await parseIngestBody(request);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const planned = planSpendIngest(body);
  if (!planned.ok) {
    return Response.json({ error: planned.error }, { status: planned.status });
  }
  const { plan } = planned;

  if (!notionReady()) {
    return Response.json(
      { error: "Notion is not configured" },
      { status: 503 },
    );
  }

  if (plan.clientId) {
    const cachedId = recalledClientId(plan.clientId);
    if (cachedId) {
      return Response.json({
        ok: true,
        id: cachedId,
        editUrl: editUrlFor(request, cachedId),
        duplicate: true,
      });
    }
  }

  const [days, people] = await Promise.all([getDays(), getEditorNames()]);
  const dayId = todayDayId(days);
  const paidBy = plan.paidBy || people[0] || "";
  const start = tokyoWallDateTime(tokyoToday(), tokyoNowTime());

  const existing = await findIngestDuplicate({
    name: plan.name,
    amount: plan.amount,
    currency: plan.currency,
    dayId,
  });
  if (existing) {
    if (plan.clientId) rememberClientId(plan.clientId, existing.id);
    return Response.json({
      ok: true,
      id: existing.id,
      editUrl: editUrlFor(request, existing.id),
      name: existing.name,
      amount: existing.amount,
      currency: existing.currency,
      category: existing.category,
      kind: existing.kind,
      paidBy: existing.paidBy,
      dayId: existing.dayIds[0] ?? dayId,
      duplicate: true,
    });
  }

  let created: { id: string };
  try {
    const notion = getNotion();
    created = await notion.pages.create({
      parent: { data_source_id: ds("SPEND") },
      properties: {
        Name: titleProp(plan.name),
        Amount: { number: plan.amount },
        Currency: { select: { name: plan.currency } },
        Kind: { select: { name: plan.kind } },
        Category: { select: { name: plan.category } },
        ...(plan.notes ? { Notes: textProp(plan.notes) } : {}),
        ...(dayId ? { Day: { relation: [{ id: dayId }] } } : {}),
        ...(start ? { Start: notionStartProperty(start) } : {}),
        ...(paidBy ? { "Paid by": { select: { name: paidBy } } } : {}),
      },
    });
  } catch (error) {
    console.error("spend ingest failed", error);
    const detail =
      error instanceof Error
        ? error.message.replace(/\s+/g, " ").trim().slice(0, 180)
        : "";
    return Response.json(
      { error: detail || "Failed to save expense" },
      { status: 502 },
    );
  }

  updateTag(TRIP_TAGS.spend);
  if (plan.clientId) rememberClientId(plan.clientId, created.id);

  return Response.json({
    ok: true,
    id: created.id,
    editUrl: editUrlFor(request, created.id),
    name: plan.name,
    amount: plan.amount,
    currency: plan.currency,
    category: plan.category,
    kind: plan.kind,
    paidBy: paidBy || null,
    dayId: dayId || null,
  });
}
