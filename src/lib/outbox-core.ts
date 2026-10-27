export const OUTBOX_MAX_ATTEMPTS = 5;

export type OutboxKind = "toggleVisited" | "addSpend" | "togglePrep";

export type ToggleVisitedPayload = {
  id: string;
  visited: boolean;
};

export type TogglePrepPayload = {
  id: string;
  done: boolean;
};

export type AddSpendPayload = {
  clientId: string;
  createdAt: string;
  name: string;
  amount: number;
  currency: string;
  kind: string;
  category: string;
  notes: string;
  dayId: string;
  paidBy: string;
  dayDate: string;
  time: string;
};

export type OutboxPayload =
  | ToggleVisitedPayload
  | TogglePrepPayload
  | AddSpendPayload;

export type OutboxEntry = {
  id: string;
  kind: OutboxKind;
  payload: OutboxPayload;
  createdAt: string;
  attempts: number;
  /** ISO time of the first send attempt; set in IndexedDB before each send. */
  firstAttemptAt: string | null;
  lastError: string | null;
};

export type ReplayDecision =
  | { action: "delete" }
  | { action: "keep"; attempts: number; lastError: string; giveUp: boolean }
  | { action: "keep_editor"; lastError: string };

export function sortOutboxByCreatedAt(entries: OutboxEntry[]): OutboxEntry[] {
  return [...entries].sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? -1 : 1;
    }
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function buildToggleVisitedPayload(
  id: string,
  visited: boolean,
): ToggleVisitedPayload {
  return { id, visited };
}

export function buildTogglePrepPayload(id: string, done: boolean): TogglePrepPayload {
  return { id, done };
}

export function buildAddSpendPayload(
  input: Omit<AddSpendPayload, "clientId" | "createdAt"> & {
    clientId?: string;
    createdAt?: string;
  },
): AddSpendPayload {
  return {
    clientId: input.clientId ?? crypto.randomUUID(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    name: input.name,
    amount: input.amount,
    currency: input.currency,
    kind: input.kind,
    category: input.category,
    notes: input.notes,
    dayId: input.dayId,
    paidBy: input.paidBy,
    dayDate: input.dayDate,
    time: input.time,
  };
}

export function makeOutboxEntry(
  kind: OutboxKind,
  payload: OutboxPayload,
  opts?: { id?: string; createdAt?: string },
): OutboxEntry {
  return {
    id: opts?.id ?? crypto.randomUUID(),
    kind,
    payload,
    createdAt: opts?.createdAt ?? new Date().toISOString(),
    attempts: 0,
    firstAttemptAt: null,
    lastError: null,
  };
}

/** Persist before a send so a lost response still counts as "sent before". */
export function markOutboxSendAttempt(
  entry: OutboxEntry,
  now: Date = new Date(),
): OutboxEntry {
  return {
    ...entry,
    firstAttemptAt: entry.firstAttemptAt ?? now.toISOString(),
  };
}

/** Dedupe form fields only on retries (attempts > 0). */
export function shouldDedupeSpendReplay(entry: OutboxEntry): boolean {
  return entry.attempts > 0;
}

export function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (!error) return false;
  if (error instanceof TypeError) return true;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /failed to fetch|networkerror|load failed|network request failed/i.test(
    message,
  );
}

export function decideReplayResult(input: {
  entry: OutboxEntry;
  ok: boolean;
  error?: string;
  editorRequired?: boolean;
  networkError?: boolean;
}): ReplayDecision {
  if (input.ok) return { action: "delete" };
  if (input.editorRequired) {
    return {
      action: "keep_editor",
      lastError: input.error ?? "editor_required",
    };
  }
  if (input.networkError) {
    // Count the attempt so a lost success response retries with spend dedupe,
    // but never give up solely because of flaky connectivity.
    return {
      action: "keep",
      attempts: input.entry.attempts + 1,
      lastError: input.error ?? "network",
      giveUp: false,
    };
  }
  const attempts = input.entry.attempts + 1;
  return {
    action: "keep",
    attempts,
    lastError: input.error ?? "error",
    giveUp: attempts >= OUTBOX_MAX_ATTEMPTS,
  };
}

/**
 * Stamp an offline-queued spend with the chosen calendar day plus the current
 * Asia/Tokyo wall-clock time at minute precision (seconds zeroed, +09:00).
 * Keeps two identical same-day purchases from collapsing on outbox replay.
 */
export function buildOfflineSpendCreatedAt(
  dayDate: string,
  now: Date = new Date(),
): string {
  const date = dayDate.trim().slice(0, 10);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${date}T${hour}:${minute}:00+09:00`;
}

const HAS_TZ_OFFSET = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

function ensureTokyoOffsetLocal(value: string): string {
  const raw = value.trim();
  if (!raw.includes("T")) return `${raw.slice(0, 10)}T00:00:00+09:00`;
  if (HAS_TZ_OFFSET.test(raw)) return raw;
  if (/T\d{2}:\d{2}$/.test(raw)) return `${raw}:00+09:00`;
  if (/T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(raw)) return `${raw}+09:00`;
  return raw;
}

/** Truncate an ISO-ish timestamp to Asia/Tokyo minute precision for spend idempotency. */
export function minuteKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(ensureTokyoOffsetLocal(value));
  if (!Number.isNaN(parsed.getTime())) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(parsed);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;
    const y = get("year");
    const m = get("month");
    const d = get("day");
    const h = get("hour");
    const min = get("minute");
    if (y && m && d && h && min) return `${y}-${m}-${d}T${h}:${min}`;
  }
  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  return match?.[1] ?? null;
}

export function sameMinute(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ka = minuteKey(a);
  const kb = minuteKey(b);
  return Boolean(ka && kb && ka === kb);
}

const SPEND_DEDUPE_CREATED_SLACK_MS = 2 * 60 * 1000;

/**
 * Pure duplicate match for outbox spend retries.
 * Notion `created_time` is minute-precision, so allow 2 minutes before firstAttemptAt.
 */
export function spendDuplicateMatches(input: {
  name: string;
  amount: number;
  currency: string;
  dayId: string;
  createdAt: string;
  firstAttemptAt: string;
  candidate: {
    name: string;
    amount: number;
    currency: string;
    dayIds: string[];
    start: string | null;
    createdTime: string;
  };
}): boolean {
  const { candidate } = input;
  if (candidate.name !== input.name) return false;
  if (candidate.amount !== input.amount) return false;
  if (candidate.currency !== input.currency) return false;
  if (input.dayId && !candidate.dayIds.includes(input.dayId)) return false;
  if (!sameMinute(candidate.start, input.createdAt)) return false;
  const attemptMs = new Date(input.firstAttemptAt).getTime();
  const createdMs = new Date(candidate.createdTime).getTime();
  if (Number.isNaN(attemptMs) || Number.isNaN(createdMs)) return false;
  return createdMs >= attemptMs - SPEND_DEDUPE_CREATED_SLACK_MS;
}
