import { dateKey } from "@/lib/format";

export const ESIM_STORAGE_KEY = "japan-trip:esim-v1";
export const ESIM_VERSION = 1 as const;
export const ESIM_CHANGED_EVENT = "japan-trip-esim";

export type EsimPlan = {
  id: string;
  name: string;
  dataAllowance: string;
  expiryDate: string | null;
  notes: string;
  order: number;
};

export type EsimStore = {
  v: typeof ESIM_VERSION;
  plans: EsimPlan[];
};

export type EsimExpiryStatus = "none" | "valid" | "expired";

function newEsimId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `esim-${crypto.randomUUID()}`;
  }
  return `esim-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeExpiry(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const key = dateKey(value.trim());
  return key && /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}

function isEsimPlan(
  value: unknown,
): value is Record<string, unknown> & { id: string } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && record.id.length > 0;
}

export function parseEsimJson(raw: string | null | undefined): EsimPlan[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const record = parsed as Record<string, unknown>;
  if (record.v !== ESIM_VERSION || !Array.isArray(record.plans)) return [];
  const out: EsimPlan[] = [];
  const seen = new Set<string>();
  for (const item of record.plans) {
    if (!isEsimPlan(item)) continue;
    if (seen.has(item.id)) continue;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) continue;
    seen.add(item.id);
    const order =
      typeof item.order === "number" && Number.isFinite(item.order)
        ? item.order
        : out.length;
    out.push({
      id: item.id,
      name,
      dataAllowance:
        typeof item.dataAllowance === "string" ? item.dataAllowance.trim() : "",
      expiryDate: normalizeExpiry(item.expiryDate),
      notes: typeof item.notes === "string" ? item.notes.trim() : "",
      order,
    });
  }
  out.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return out;
}

export function serializeEsim(plans: readonly EsimPlan[]): string {
  const store: EsimStore = {
    v: ESIM_VERSION,
    plans: plans.map((plan, index) => ({
      id: plan.id,
      name: plan.name,
      dataAllowance: plan.dataAllowance,
      expiryDate: plan.expiryDate,
      notes: plan.notes,
      order: plan.order ?? index,
    })),
  };
  return JSON.stringify(store);
}

export function createEsimPlan(input: {
  name: string;
  dataAllowance?: string;
  expiryDate?: string | null;
  notes?: string;
  order?: number;
}): EsimPlan {
  return {
    id: newEsimId(),
    name: input.name.trim(),
    dataAllowance: input.dataAllowance?.trim() ?? "",
    expiryDate: normalizeExpiry(input.expiryDate ?? null),
    notes: input.notes?.trim() ?? "",
    order: input.order ?? 0,
  };
}

export function upsertEsimPlan(
  plans: readonly EsimPlan[],
  plan: EsimPlan,
): EsimPlan[] {
  const next: EsimPlan = {
    ...plan,
    name: plan.name.trim(),
    dataAllowance: plan.dataAllowance.trim(),
    expiryDate: normalizeExpiry(plan.expiryDate),
    notes: plan.notes.trim(),
  };
  const index = plans.findIndex((item) => item.id === next.id);
  if (index === -1) {
    const order =
      plans.reduce((max, item) => Math.max(max, item.order), -1) + 1;
    return [...plans, { ...next, order }];
  }
  const copy = plans.slice();
  copy[index] = { ...copy[index], ...next, order: copy[index].order };
  return copy;
}

export function deleteEsimPlan(
  plans: readonly EsimPlan[],
  id: string,
): EsimPlan[] {
  return plans.filter((plan) => plan.id !== id);
}

/**
 * Compare a plan expiry to a Tokyo YYYY-MM-DD date.
 * Missing/invalid expiry is "none". Expires today is still "valid".
 */
export function esimExpiryStatus(
  expiryDate: string | null,
  today: string,
): EsimExpiryStatus {
  const expiry = normalizeExpiry(expiryDate ?? "");
  const todayKey = normalizeExpiry(today);
  if (!expiry || !todayKey) return "none";
  return expiry < todayKey ? "expired" : "valid";
}

export function isEsimExpired(
  expiryDate: string | null,
  today: string,
): boolean {
  return esimExpiryStatus(expiryDate, today) === "expired";
}

const EMPTY_PLANS: EsimPlan[] = [];

let esimMemoryRaw: string | null | undefined;
let esimMemoryPlans: EsimPlan[] = EMPTY_PLANS;

export function invalidateEsimMemory() {
  esimMemoryRaw = undefined;
  esimMemoryPlans = EMPTY_PLANS;
}

export function readCachedEsim(getRaw: () => string | null): EsimPlan[] {
  const raw = getRaw();
  if (raw === esimMemoryRaw && esimMemoryRaw !== undefined) {
    return esimMemoryPlans;
  }
  const plans = parseEsimJson(raw);
  esimMemoryRaw = raw;
  esimMemoryPlans = plans.length === 0 ? EMPTY_PLANS : plans;
  return esimMemoryPlans;
}

/** SSR-safe read. Missing or invalid store returns []. */
export function readEsim(): EsimPlan[] {
  if (typeof window === "undefined") return EMPTY_PLANS;
  try {
    return readCachedEsim(() => window.localStorage.getItem(ESIM_STORAGE_KEY));
  } catch {
    return EMPTY_PLANS;
  }
}

export function writeEsim(plans: readonly EsimPlan[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = serializeEsim(plans);
    window.localStorage.setItem(ESIM_STORAGE_KEY, raw);
    esimMemoryRaw = raw;
    esimMemoryPlans = plans.length === 0 ? EMPTY_PLANS : plans.slice();
    window.dispatchEvent(new Event(ESIM_CHANGED_EVENT));
  } catch {
    // quota / private mode — ignore
  }
}
