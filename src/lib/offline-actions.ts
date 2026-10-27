import {
  addSpend,
  togglePrepItem,
  toggleVisited,
} from "@/app/actions";
import type { ActionResult } from "@/lib/action-result";
import { ensureTokyoOffset, tokyoWallDateTime } from "@/lib/format";
import {
  buildAddSpendPayload,
  buildOfflineSpendCreatedAt,
  buildTogglePrepPayload,
  buildToggleVisitedPayload,
  isNetworkFailure,
  shouldDedupeSpendReplay,
  type AddSpendPayload,
  type OutboxEntry,
  type TogglePrepPayload,
  type ToggleVisitedPayload,
} from "@/lib/outbox-core";
import { enqueueOutbox } from "@/lib/outbox";
import { parseSpendCurrency } from "@/lib/spend";
import type { SpendCurrency, SpendItem } from "@/lib/types";

export type OfflineEnqueueResult =
  | { status: "synced"; result: ActionResult }
  | {
      status: "queued";
      entryId: string;
      kind: "toggleVisited" | "addSpend" | "togglePrep";
      payload: ToggleVisitedPayload | TogglePrepPayload | AddSpendPayload;
    }
  | { status: "error"; result: ActionResult };

function spendCreatedAtFromForm(formData: FormData): string {
  const existing = String(formData.get("clientCreatedAt") ?? "").trim();
  if (existing) return ensureTokyoOffset(existing);
  const dayDate = String(formData.get("dayDate") ?? "").trim().slice(0, 10);
  const time = String(formData.get("time") ?? "").trim();
  if (dayDate && time) {
    const hm = time.length >= 5 ? time.slice(0, 5) : time;
    return tokyoWallDateTime(dayDate, hm);
  }
  if (dayDate) return dayDate;
  return new Date().toISOString();
}

export function spendPayloadFromForm(formData: FormData): AddSpendPayload {
  const createdAt = spendCreatedAtFromForm(formData);
  const clientId =
    String(formData.get("clientId") ?? "").trim() || crypto.randomUUID();
  return buildAddSpendPayload({
    clientId,
    createdAt,
    name: String(formData.get("name") ?? "").trim(),
    amount: Number(String(formData.get("amount") ?? "").trim()),
    currency: parseSpendCurrency(String(formData.get("currency") ?? "")),
    kind: String(formData.get("kind") ?? "").trim() || "Actual",
    category: String(formData.get("category") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    dayId: String(formData.get("dayId") ?? "").trim(),
    paidBy: String(formData.get("paidBy") ?? "").trim(),
    dayDate: String(formData.get("dayDate") ?? "").trim().slice(0, 10),
    time: String(formData.get("time") ?? "").trim(),
  });
}

export function formDataFromSpendPayload(
  payload: AddSpendPayload,
  opts?: { entry?: OutboxEntry },
): FormData {
  const formData = new FormData();
  formData.set("name", payload.name);
  formData.set("amount", String(payload.amount));
  formData.set("currency", payload.currency);
  formData.set("kind", payload.kind);
  formData.set("category", payload.category);
  formData.set("notes", payload.notes);
  formData.set("dayId", payload.dayId);
  formData.set("paidBy", payload.paidBy);
  if (payload.dayDate) formData.set("dayDate", payload.dayDate);
  if (payload.time) formData.set("time", payload.time);
  formData.set("clientId", payload.clientId);
  formData.set("clientCreatedAt", ensureTokyoOffset(payload.createdAt));
  // First attempts never dedupe; only retries after a prior send.
  if (opts?.entry && shouldDedupeSpendReplay(opts.entry) && opts.entry.firstAttemptAt) {
    formData.set("dedupe", "1");
    formData.set("firstAttemptAt", opts.entry.firstAttemptAt);
  }
  return formData;
}

export function optimisticSpendFromPayload(payload: AddSpendPayload): SpendItem {
  return {
    id: `outbox:${payload.clientId}`,
    name: payload.name,
    amount: payload.amount,
    currency: payload.currency as SpendCurrency,
    kind: payload.kind || "Actual",
    category: payload.category || null,
    notes: payload.notes,
    dayIds: payload.dayId ? [payload.dayId] : [],
    start: payload.createdAt,
    paidBy: payload.paidBy || null,
  };
}

export async function runToggleVisited(
  id: string,
  visited: boolean,
): Promise<OfflineEnqueueResult> {
  const payload = buildToggleVisitedPayload(id, visited);
  const formData = new FormData();
  formData.set("id", id);
  formData.set("visited", visited ? "true" : "false");

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const entry = await enqueueOutbox("toggleVisited", payload);
    return { status: "queued", entryId: entry.id, kind: "toggleVisited", payload };
  }

  try {
    const result = await toggleVisited(formData);
    if (!result.ok) return { status: "error", result };
    return { status: "synced", result };
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;
    const entry = await enqueueOutbox("toggleVisited", payload);
    return { status: "queued", entryId: entry.id, kind: "toggleVisited", payload };
  }
}

export async function runTogglePrep(
  id: string,
  done: boolean,
): Promise<OfflineEnqueueResult> {
  const payload = buildTogglePrepPayload(id, done);
  const formData = new FormData();
  formData.set("id", id);
  formData.set("done", done ? "true" : "false");

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const entry = await enqueueOutbox("togglePrep", payload);
    return { status: "queued", entryId: entry.id, kind: "togglePrep", payload };
  }

  try {
    const result = await togglePrepItem(formData);
    if (!result.ok) return { status: "error", result };
    return { status: "synced", result };
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;
    const entry = await enqueueOutbox("togglePrep", payload);
    return { status: "queued", entryId: entry.id, kind: "togglePrep", payload };
  }
}

function stampQueuedSpend(payload: AddSpendPayload): AddSpendPayload {
  const dayDate =
    payload.dayDate.trim().slice(0, 10) ||
    payload.createdAt.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayDate)) return payload;
  return {
    ...payload,
    createdAt: buildOfflineSpendCreatedAt(dayDate),
  };
}

export async function runAddSpend(
  formData: FormData,
): Promise<OfflineEnqueueResult> {
  const payload = spendPayloadFromForm(formData);
  const send = formDataFromSpendPayload(payload);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const queued = stampQueuedSpend(payload);
    const entry = await enqueueOutbox("addSpend", queued);
    return { status: "queued", entryId: entry.id, kind: "addSpend", payload: queued };
  }

  try {
    const result = await addSpend(send);
    if (!result.ok) return { status: "error", result };
    return { status: "synced", result };
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;
    const queued = stampQueuedSpend(payload);
    const entry = await enqueueOutbox("addSpend", queued);
    return { status: "queued", entryId: entry.id, kind: "addSpend", payload: queued };
  }
}
