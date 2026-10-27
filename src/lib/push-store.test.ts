import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isPushStoreConfigured,
  isPushStoreWritable,
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
