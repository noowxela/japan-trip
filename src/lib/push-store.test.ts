import { afterEach, describe, expect, it, vi } from "vitest";
import {
  filterByPref,
  isPushStoreConfigured,
  isPushStoreWritable,
  mergePrefs,
  normalizePrefs,
  normalizeSubscription,
  parseSubscriptionsJson,
} from "@/lib/push-store";

const valid = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc",
  expirationTime: null,
  keys: {
    p256dh: "p256dh-key",
    auth: "auth-key",
  },
};

describe("normalizeSubscription", () => {
  it("accepts a valid PushSubscriptionJSON shape", () => {
    expect(normalizeSubscription(valid)).toEqual(valid);
  });

  it("rejects missing keys or non-https endpoints", () => {
    expect(normalizeSubscription(null)).toBeNull();
    expect(
      normalizeSubscription({ ...valid, endpoint: "http://insecure.example" }),
    ).toBeNull();
    expect(
      normalizeSubscription({ ...valid, keys: { p256dh: "x" } }),
    ).toBeNull();
  });

  it("normalizes prefs when present; omits when absent (legacy)", () => {
    expect(normalizeSubscription(valid)?.prefs).toBeUndefined();
    expect(
      normalizeSubscription({
        ...valid,
        prefs: { reminders: false, countdown: true },
      })?.prefs,
    ).toEqual({ reminders: false, countdown: true });
    expect(
      normalizeSubscription({
        ...valid,
        prefs: { reminders: false },
      })?.prefs,
    ).toEqual({ reminders: false, countdown: true });
  });
});

describe("normalizePrefs / mergePrefs / filterByPref", () => {
  it("defaults both channels on when missing", () => {
    expect(normalizePrefs(undefined)).toEqual({
      reminders: true,
      countdown: true,
    });
    expect(normalizePrefs(null)).toEqual({
      reminders: true,
      countdown: true,
    });
    expect(normalizePrefs({})).toEqual({
      reminders: true,
      countdown: true,
    });
  });

  it("merges partial prefs onto defaults / existing", () => {
    expect(mergePrefs(undefined, { countdown: false })).toEqual({
      reminders: true,
      countdown: false,
    });
    expect(
      mergePrefs({ reminders: false, countdown: true }, { reminders: true }),
    ).toEqual({ reminders: true, countdown: true });
  });

  it("filters by pref with missing prefs = on", () => {
    const legacy = { ...valid };
    const offReminders = {
      ...valid,
      endpoint: "https://fcm.googleapis.com/fcm/send/b",
      prefs: { reminders: false, countdown: true },
    };
    const offCountdown = {
      ...valid,
      endpoint: "https://fcm.googleapis.com/fcm/send/c",
      prefs: { reminders: true, countdown: false },
    };
    const subs = [legacy, offReminders, offCountdown];
    expect(filterByPref(subs, "reminders").map((s) => s.endpoint)).toEqual([
      legacy.endpoint,
      offCountdown.endpoint,
    ]);
    expect(filterByPref(subs, "countdown").map((s) => s.endpoint)).toEqual([
      legacy.endpoint,
      offReminders.endpoint,
    ]);
  });
});

describe("parseSubscriptionsJson", () => {
  it("parses an array and dedupes by endpoint", () => {
    const raw = JSON.stringify([valid, { ...valid, keys: { p256dh: "other", auth: "a" } }]);
    const parsed = parseSubscriptionsJson(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.keys.p256dh).toBe("other");
  });

  it("returns empty for blank input", () => {
    expect(parseSubscriptionsJson("")).toEqual([]);
    expect(parseSubscriptionsJson(undefined)).toEqual([]);
  });

  it("throws on invalid JSON or non-array", () => {
    expect(() => parseSubscriptionsJson("{")).toThrow(/valid JSON/);
    expect(() => parseSubscriptionsJson("{}")).toThrow(/array/);
  });

  it("skips invalid entries in the array", () => {
    const parsed = parseSubscriptionsJson(JSON.stringify([valid, { endpoint: "x" }, null]));
    expect(parsed).toEqual([valid]);
  });

  it("keeps prefs from env fallback JSON (read-only)", () => {
    const withPrefs = {
      ...valid,
      prefs: { reminders: true, countdown: false },
    };
    const parsed = parseSubscriptionsJson(JSON.stringify([withPrefs]));
    expect(parsed[0]?.prefs).toEqual({ reminders: true, countdown: false });
  });

  it("backward compat: legacy rows without prefs parse cleanly", () => {
    const parsed = parseSubscriptionsJson(JSON.stringify([valid]));
    expect(parsed).toEqual([valid]);
    expect(normalizePrefs(parsed[0]?.prefs).countdown).toBe(true);
  });
});

describe("isPushStoreConfigured / writable", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detects KV env variants and PUSH_SUBSCRIPTIONS fallback", () => {
    expect(isPushStoreWritable()).toBe(false);
    expect(isPushStoreConfigured()).toBe(false);

    vi.stubEnv("PUSH_SUBSCRIPTIONS", JSON.stringify([valid]));
    expect(isPushStoreWritable()).toBe(false);
    expect(isPushStoreConfigured()).toBe(true);

    vi.stubEnv("KV_REST_API_URL", "https://example.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "token");
    expect(isPushStoreWritable()).toBe(true);
    expect(isPushStoreConfigured()).toBe(true);
  });

  it("accepts UPSTASH_REDIS_REST_* aliases", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    expect(isPushStoreWritable()).toBe(true);
  });
});
