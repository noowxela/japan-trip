import { afterEach, describe, expect, it } from "vitest";
import { authorizeSpendIngest } from "@/lib/spend-ingest-auth";

const ENV = "SPEND_INGEST_SECRET";

afterEach(() => {
  delete process.env[ENV];
  delete process.env.CRON_SECRET;
});

function req(header?: string) {
  return new Request("http://localhost/api/spend", {
    method: "POST",
    headers: header ? { authorization: header } : {},
  });
}

describe("authorizeSpendIngest", () => {
  it("rejects when the secret is missing", () => {
    expect(authorizeSpendIngest(req("Bearer anything"))).toBe(false);
  });

  it("rejects a missing or mismatched header", () => {
    process.env[ENV] = "super-secret";
    expect(authorizeSpendIngest(req())).toBe(false);
    expect(authorizeSpendIngest(req("Bearer nope"))).toBe(false);
    expect(authorizeSpendIngest(req("super-secret"))).toBe(false);
  });

  it("does not accept CRON_SECRET", () => {
    process.env.CRON_SECRET = "cron-secret";
    process.env[ENV] = "spend-secret";
    expect(authorizeSpendIngest(req("Bearer cron-secret"))).toBe(false);
    expect(authorizeSpendIngest(req("Bearer spend-secret"))).toBe(true);
  });

  it("accepts a matching bearer token", () => {
    process.env[ENV] = "super-secret";
    expect(authorizeSpendIngest(req("Bearer super-secret"))).toBe(true);
  });
});
