import { dateKey, tokyoToday } from "@/lib/format";
import {
  SPEND_CATEGORIES,
  SPEND_KINDS,
  type SpendCurrency,
  type TripDay,
} from "@/lib/types";

export const INGEST_DEDUPE_WINDOW_MS = 2 * 60 * 1000;

export type IngestCardDefaults = {
  category: (typeof SPEND_CATEGORIES)[number];
  currency: "Yen";
  kind: "Actual";
  sourceLabel: string;
};

const FULLWIDTH_DIGITS = /[０-９]/g;

function toHalfWidthDigit(ch: string) {
  return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
}

/** Parse Wallet / Shortcuts amount strings such as `¥120`, `120円`, `JPY 1,280`. */
export function parseWalletAmount(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw !== "string") return null;
  let text = raw.trim();
  if (!text) return null;
  text = text.replace(FULLWIDTH_DIGITS, toHalfWidthDigit);
  text = text.replace(/[，]/g, ",").replace(/[．]/g, ".");
  text = text.replace(/[¥￥$€£]/g, "");
  text = text.replace(/\b(jpy|usd|eur|myr|rm|yen)\b/gi, "");
  text = text.replace(/円/g, "");
  text = text.replace(/[\s\u00a0\u3000]/g, "");
  text = text.replace(/,/g, "");
  if (!text) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function defaultsForCard(card: string): IngestCardDefaults {
  const trimmed = card.trim();
  const lower = trimmed.toLowerCase();
  if (lower.includes("suica")) {
    return {
      category: "Transit",
      currency: "Yen",
      kind: "Actual",
      sourceLabel: "Suica",
    };
  }
  if (lower.includes("wise")) {
    return {
      category: "Other",
      currency: "Yen",
      kind: "Actual",
      sourceLabel: "Wise",
    };
  }
  return {
    category: "Other",
    currency: "Yen",
    kind: "Actual",
    sourceLabel: trimmed || "Apple Pay",
  };
}

export function ingestExpenseName(input: {
  merchant?: string;
  name?: string;
  card?: string;
  category: string;
}): string {
  const merchant = input.merchant?.trim() ?? "";
  if (merchant) return merchant;
  const name = input.name?.trim() ?? "";
  if (name) return name;
  const card = input.card?.trim() ?? "";
  if (card) return card;
  return input.category;
}

export function ingestSourceNotes(sourceLabel: string): string {
  const label = sourceLabel.trim() || "Apple Pay";
  if (label === "Apple Pay") return "Apple Pay";
  return `Apple Pay · ${label}`;
}

export function todayDayId(
  days: Pick<TripDay, "id" | "date">[],
  today = tokyoToday(),
): string {
  return days.find((day) => dateKey(day.date) === today)?.id ?? "";
}

export function ingestDuplicateMatches(input: {
  name: string;
  amount: number;
  currency: string;
  dayId: string;
  nowMs?: number;
  candidate: {
    name: string;
    amount: number;
    currency: string;
    dayIds: string[];
    createdTime: string;
  };
}): boolean {
  const { candidate } = input;
  if (candidate.name !== input.name) return false;
  if (candidate.amount !== input.amount) return false;
  if (candidate.currency !== input.currency) return false;
  if (input.dayId && !candidate.dayIds.includes(input.dayId)) return false;
  const createdMs = new Date(candidate.createdTime).getTime();
  if (Number.isNaN(createdMs)) return false;
  const nowMs = input.nowMs ?? Date.now();
  const age = nowMs - createdMs;
  return age <= INGEST_DEDUPE_WINDOW_MS && age >= -5_000;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pick(record: Record<string, unknown>, ...names: string[]): unknown {
  const lower = new Map(
    Object.entries(record).map(([key, value]) => [key.toLowerCase(), value]),
  );
  for (const name of names) {
    const value = lower.get(name.toLowerCase());
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return undefined;
}

function pickString(record: Record<string, unknown>, ...names: string[]): string {
  const value = pick(record, ...names);
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function isSpendCategory(
  value: string,
): value is (typeof SPEND_CATEGORIES)[number] {
  return (SPEND_CATEGORIES as readonly string[]).includes(value);
}

function isSpendKind(value: string): value is (typeof SPEND_KINDS)[number] {
  return (SPEND_KINDS as readonly string[]).includes(value);
}

function parseCurrencyOverride(value: string): SpendCurrency | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "yen" || normalized === "jpy" || normalized === "円") return "Yen";
  if (normalized === "rm" || normalized === "myr") return "RM";
  return null;
}

export type SpendIngestPlan = {
  amount: number;
  name: string;
  merchant: string;
  card: string;
  category: (typeof SPEND_CATEGORIES)[number];
  kind: (typeof SPEND_KINDS)[number];
  currency: SpendCurrency;
  notes: string;
  clientId: string;
  paidBy: string;
};

export function planSpendIngest(
  input: Record<string, unknown>,
): { ok: true; plan: SpendIngestPlan } | { ok: false; error: string; status: 400 } {
  const amount = parseWalletAmount(pick(input, "amount"));
  if (amount === null) {
    return { ok: false, error: "A valid amount is required", status: 400 };
  }

  const merchant = pickString(input, "merchant");
  const card = pickString(input, "card");
  const explicitName = pickString(input, "name");
  const defaults = defaultsForCard(card);
  const categoryRaw = pickString(input, "category");
  const kindRaw = pickString(input, "kind");
  const currencyRaw = pickString(input, "currency");
  const category = isSpendCategory(categoryRaw) ? categoryRaw : defaults.category;
  const kind = isSpendKind(kindRaw) ? kindRaw : defaults.kind;
  const currency = parseCurrencyOverride(currencyRaw) ?? defaults.currency;
  const name = ingestExpenseName({
    merchant,
    name: explicitName,
    card,
    category,
  });
  const notes = pickString(input, "notes") || ingestSourceNotes(defaults.sourceLabel);

  return {
    ok: true,
    plan: {
      amount,
      name,
      merchant,
      card,
      category,
      kind,
      currency,
      notes,
      clientId: pickString(
        input,
        "clientId",
        "client_id",
        "idempotencyKey",
        "idempotency-key",
        "transactionId",
        "transactionIdentifier",
      ),
      paidBy: pickString(input, "paidBy", "paid_by"),
    },
  };
}

export async function parseIngestBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const form = await request.formData();
    const record: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") record[key] = value;
    }
    return record;
  }

  const text = await request.text();
  if (!text.trim()) return {};
  try {
    const data = asRecord(JSON.parse(text));
    if (!data) {
      throw new Error("Invalid JSON object");
    }
    return data;
  } catch (error) {
    if (contentType.includes("application/json") || contentType.includes("+json")) {
      throw error;
    }
    const params = new URLSearchParams(text);
    const record: Record<string, unknown> = {};
    for (const [key, value] of params.entries()) record[key] = value;
    if (Object.keys(record).length > 0) return record;
    throw error;
  }
}
