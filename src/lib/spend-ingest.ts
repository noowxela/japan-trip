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

/**
 * Wallet / Shortcuts "Currency Amount" is often a nested dictionary
 * (`{ amount, currency }` / `{ Amount, CurrencyCode }`), not a bare number.
 * Accept numbers, Wallet-style strings, and one level of nesting.
 */
export function parseWalletAmount(raw: unknown, depth = 0): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === "string") {
    let text = raw.trim();
    if (!text) return null;
    // Sometimes Shortcuts stringifies the Currency Amount object.
    if (
      depth < 2 &&
      ((text.startsWith("{") && text.endsWith("}")) ||
        (text.startsWith("[") && text.endsWith("]")))
    ) {
      try {
        return parseWalletAmount(JSON.parse(text), depth + 1);
      } catch {
        // fall through to plain amount parsing
      }
    }
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
  if (depth >= 2) return null;
  const record = asRecord(raw);
  if (!record) return null;
  const nested = pick(
    record,
    "amount",
    "value",
    "number",
    "quantity",
    "magnitude",
  );
  if (nested !== undefined) {
    const parsed = parseWalletAmount(nested, depth + 1);
    if (parsed !== null) return parsed;
  }
  return null;
}

function currencyFromAmountValue(raw: unknown): SpendCurrency | null {
  const record = asRecord(raw);
  if (!record) return null;
  const code = pickString(
    record,
    "currency",
    "currencyCode",
    "currency_code",
    "isoCurrencyCode",
  );
  return parseCurrencyOverride(code);
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

const AMOUNT_KEYS = [
  "amount",
  "currency amount",
  "currencyamount",
  "currency_amount",
  "transactionAmount",
  "transaction_amount",
] as const;

const MERCHANT_KEYS = [
  "merchant",
  "merchantName",
  "merchant_name",
  "merchant name",
  "payee",
  "location",
  "vendor",
] as const;

const NAME_KEYS = ["name", "transactionName", "transaction_name", "title"] as const;

const CARD_KEYS = [
  "card",
  "card or pass",
  "cardOrPass",
  "card_or_pass",
  "paymentMethod",
  "payment_method",
  "pass",
] as const;

function hasAmountishKey(record: Record<string, unknown>): boolean {
  return pick(record, ...AMOUNT_KEYS) !== undefined;
}

/** Merge common Wallet / Shortcuts wrappers so nested Currency Amount is reachable. */
export function normalizeIngestPayload(
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (hasAmountishKey(input)) return input;
  for (const key of [
    "transaction",
    "input",
    "shortcut input",
    "shortcutInput",
    "shortcut_input",
    "data",
    "body",
    "payload",
  ]) {
    const inner = asRecord(pick(input, key));
    if (inner && hasAmountishKey(inner)) {
      return { ...input, ...inner };
    }
  }
  return input;
}

export type ExtractedIngestFields = {
  amount: number | null;
  amountRaw: unknown;
  merchant: string;
  name: string;
  card: string;
  currencyHint: string;
};

/** Peek amount / merchant / name / card the same way planSpendIngest does. */
export function extractIngestFields(
  input: Record<string, unknown>,
): ExtractedIngestFields {
  const record = normalizeIngestPayload(input);
  const amountRaw = pick(record, ...AMOUNT_KEYS);
  const amount = parseWalletAmount(amountRaw);
  const merchant = pickString(record, ...MERCHANT_KEYS);
  const name = pickString(record, ...NAME_KEYS);
  const card = pickString(record, ...CARD_KEYS);
  const nestedAmount = asRecord(amountRaw);
  const currencyHint =
    pickString(record, "currency", "currencyCode", "currency_code") ||
    (nestedAmount
      ? pickString(
          nestedAmount,
          "currency",
          "currencyCode",
          "currency_code",
          "isoCurrencyCode",
        )
      : "");
  return {
    amount,
    amountRaw,
    merchant,
    name,
    card,
    currencyHint,
  };
}

/** Compact JSON for ingest-log diagnosis (KV size-safe). */
export function summarizeIngestPayload(
  input: Record<string, unknown>,
  maxLen = 1200,
): string {
  try {
    const json = JSON.stringify(input);
    if (json.length <= maxLen) return json;
    return `${json.slice(0, maxLen)}…`;
  } catch {
    return "[unserializable]";
  }
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
  const record = normalizeIngestPayload(input);
  const fields = extractIngestFields(record);
  if (fields.amount === null) {
    return { ok: false, error: "A valid amount is required", status: 400 };
  }

  const merchant = fields.merchant;
  const card = fields.card;
  const explicitName = fields.name;
  const defaults = defaultsForCard(card);
  const categoryRaw = pickString(record, "category");
  const kindRaw = pickString(record, "kind");
  const currencyRaw =
    pickString(record, "currency", "currencyCode", "currency_code") ||
    fields.currencyHint;
  const nestedCurrency = currencyFromAmountValue(fields.amountRaw);
  const category = isSpendCategory(categoryRaw) ? categoryRaw : defaults.category;
  const kind = isSpendKind(kindRaw) ? kindRaw : defaults.kind;
  const currency =
    parseCurrencyOverride(currencyRaw) ?? nestedCurrency ?? defaults.currency;
  const name = ingestExpenseName({
    merchant,
    name: explicitName,
    card,
    category,
  });
  const notes = pickString(record, "notes") || ingestSourceNotes(defaults.sourceLabel);

  return {
    ok: true,
    plan: {
      amount: fields.amount,
      name,
      merchant,
      card,
      category,
      kind,
      currency,
      notes,
      clientId: pickString(
        record,
        "clientId",
        "client_id",
        "idempotencyKey",
        "idempotency-key",
        "transactionId",
        "transactionIdentifier",
      ),
      paidBy: pickString(record, "paidBy", "paid_by"),
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
