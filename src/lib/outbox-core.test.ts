import { describe, expect, it } from "vitest";
import {
  buildAddSpendPayload,
  buildOfflineSpendCreatedAt,
  buildTogglePrepPayload,
  buildToggleVisitedPayload,
  decideReplayResult,
  makeOutboxEntry,
  markOutboxSendAttempt,
  minuteKey,
  OUTBOX_MAX_ATTEMPTS,
  sameMinute,
  shouldDedupeSpendReplay,
  spendDuplicateMatches,
  sortOutboxByCreatedAt,
} from "@/lib/outbox-core";

describe("sortOutboxByCreatedAt", () => {
  it("orders by createdAt then id", () => {
    const a = makeOutboxEntry(
      "toggleVisited",
      buildToggleVisitedPayload("p1", true),
      { id: "b", createdAt: "2026-10-27T10:00:00.000Z" },
    );
    const b = makeOutboxEntry(
      "togglePrep",
      buildTogglePrepPayload("x", false),
      { id: "a", createdAt: "2026-10-27T09:00:00.000Z" },
    );
    const c = makeOutboxEntry(
      "toggleVisited",
      buildToggleVisitedPayload("p2", false),
      { id: "c", createdAt: "2026-10-27T10:00:00.000Z" },
    );
    expect(sortOutboxByCreatedAt([a, b, c]).map((e) => e.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("desired-state payloads", () => {
  it("builds visited desired state (never flip)", () => {
    expect(buildToggleVisitedPayload("abc", true)).toEqual({
      id: "abc",
      visited: true,
    });
    expect(buildToggleVisitedPayload("abc", false)).toEqual({
      id: "abc",
      visited: false,
    });
  });

  it("builds prep desired state", () => {
    expect(buildTogglePrepPayload("p", true).done).toBe(true);
    expect(buildTogglePrepPayload("p", false).done).toBe(false);
  });

  it("builds spend payload with clientId and createdAt", () => {
    const payload = buildAddSpendPayload({
      clientId: "cid-1",
      createdAt: "2026-10-27T12:34:00+09:00",
      name: "Ramen",
      amount: 12,
      currency: "RM",
      kind: "Actual",
      category: "Food",
      notes: "",
      dayId: "day-1",
      paidBy: "Alex",
      dayDate: "2026-10-27",
      time: "12:34",
    });
    expect(payload.clientId).toBe("cid-1");
    expect(payload.createdAt).toBe("2026-10-27T12:34:00+09:00");
    expect(payload.name).toBe("Ramen");
  });
});

describe("decideReplayResult", () => {
  const entry = makeOutboxEntry(
    "toggleVisited",
    buildToggleVisitedPayload("p", true),
  );

  it("deletes on success", () => {
    expect(decideReplayResult({ entry, ok: true })).toEqual({
      action: "delete",
    });
  });

  it("keeps without counting attempts on editor lock", () => {
    expect(
      decideReplayResult({
        entry,
        ok: false,
        editorRequired: true,
        error: "need editor",
      }),
    ).toEqual({
      action: "keep_editor",
      lastError: "need editor",
    });
  });

  it("increments attempts on network error (for spend retry dedupe) but never gives up", () => {
    expect(
      decideReplayResult({
        entry: { ...entry, attempts: 2 },
        ok: false,
        networkError: true,
        error: "offline",
      }),
    ).toEqual({
      action: "keep",
      attempts: 3,
      lastError: "offline",
      giveUp: false,
    });
  });

  it("increments attempts and gives up after max server failures", () => {
    const almost = { ...entry, attempts: OUTBOX_MAX_ATTEMPTS - 1 };
    expect(
      decideReplayResult({
        entry: almost,
        ok: false,
        error: "notion",
      }),
    ).toEqual({
      action: "keep",
      attempts: OUTBOX_MAX_ATTEMPTS,
      lastError: "notion",
      giveUp: true,
    });
  });
});

describe("sameMinute", () => {
  it("matches Tokyo wall-clock minutes", () => {
    expect(
      sameMinute("2026-10-27T12:34:10+09:00", "2026-10-27T12:34:59+09:00"),
    ).toBe(true);
    expect(
      sameMinute("2026-10-27T12:34:00+09:00", "2026-10-27T12:35:00+09:00"),
    ).toBe(false);
  });

  it("normalises Notion millisecond offsets", () => {
    expect(
      sameMinute(
        "2026-10-27T15:42:00+09:00",
        "2026-10-27T15:42:00.000+09:00",
      ),
    ).toBe(true);
    expect(minuteKey("2026-10-27T15:42:00.000+09:00")).toBe(
      "2026-10-27T15:42",
    );
  });

  it("date-only stamps collapse to midnight Tokyo (legacy)", () => {
    expect(sameMinute("2026-10-27", "2026-10-27")).toBe(true);
    expect(minuteKey("2026-10-27")).toBe("2026-10-27T00:00");
  });
});

describe("buildOfflineSpendCreatedAt", () => {
  it("keeps the chosen date and stamps current Tokyo minute", () => {
    const stamped = buildOfflineSpendCreatedAt(
      "2026-10-27",
      new Date("2026-10-27T06:42:33.123Z"),
    );
    expect(stamped).toBe("2026-10-27T15:42:00+09:00");
  });

  it("uses a different day when the user picked another date", () => {
    const stamped = buildOfflineSpendCreatedAt(
      "2026-10-25",
      new Date("2026-10-27T06:42:33.123Z"),
    );
    expect(stamped).toBe("2026-10-25T15:42:00+09:00");
  });

  it("keeps two identical same-day purchases distinct across minutes", () => {
    const first = buildOfflineSpendCreatedAt(
      "2026-10-27",
      new Date("2026-10-27T06:42:00Z"),
    );
    const second = buildOfflineSpendCreatedAt(
      "2026-10-27",
      new Date("2026-10-27T06:43:00Z"),
    );
    expect(first).toBe("2026-10-27T15:42:00+09:00");
    expect(second).toBe("2026-10-27T15:43:00+09:00");
    expect(sameMinute(first, second)).toBe(false);
    expect(
      sameMinute(first, "2026-10-27T15:42:00.000+09:00"),
    ).toBe(true);
  });
});

describe("spend replay dedupe", () => {
  const basePayload = buildAddSpendPayload({
    clientId: "cid-a",
    createdAt: "2026-10-27T15:42:00+09:00",
    name: "Matcha latte",
    amount: 650,
    currency: "Yen",
    kind: "Actual",
    category: "Food",
    notes: "",
    dayId: "day-1",
    paidBy: "Alex",
    dayDate: "2026-10-27",
    time: "15:42",
  });

  it("first attempts never send dedupe fields (two same-minute spends both create)", () => {
    const first = makeOutboxEntry("addSpend", basePayload, {
      id: "e1",
      createdAt: "2026-10-27T06:42:00.000Z",
    });
    const second = makeOutboxEntry(
      "addSpend",
      { ...basePayload, clientId: "cid-b" },
      { id: "e2", createdAt: "2026-10-27T06:42:10.000Z" },
    );
    const markedFirst = markOutboxSendAttempt(
      first,
      new Date("2026-10-27T06:42:01.000Z"),
    );
    const markedSecond = markOutboxSendAttempt(
      second,
      new Date("2026-10-27T06:42:11.000Z"),
    );
    expect(shouldDedupeSpendReplay(markedFirst)).toBe(false);
    expect(shouldDedupeSpendReplay(markedSecond)).toBe(false);
    expect(markedFirst.attempts).toBe(0);
    expect(markedSecond.attempts).toBe(0);
  });

  it("retried entry whose earlier attempt succeeded is deduped", () => {
    const entry = markOutboxSendAttempt(
      {
        ...makeOutboxEntry("addSpend", basePayload),
        attempts: 1,
      },
      new Date("2026-10-27T06:42:00.000Z"),
    );
    expect(shouldDedupeSpendReplay(entry)).toBe(true);
    expect(entry.firstAttemptAt).toBe("2026-10-27T06:42:00.000Z");

    expect(
      spendDuplicateMatches({
        name: "Matcha latte",
        amount: 650,
        currency: "Yen",
        dayId: "day-1",
        createdAt: basePayload.createdAt,
        firstAttemptAt: entry.firstAttemptAt!,
        candidate: {
          name: "Matcha latte",
          amount: 650,
          currency: "Yen",
          dayIds: ["day-1"],
          start: "2026-10-27T15:42:00.000+09:00",
          createdTime: "2026-10-27T06:42:05.000Z",
        },
      }),
    ).toBe(true);
  });

  it("retried entry does not match a page created before firstAttemptAt", () => {
    const firstAttemptAt = "2026-10-27T06:42:00.000Z";
    expect(
      spendDuplicateMatches({
        name: "Matcha latte",
        amount: 650,
        currency: "Yen",
        dayId: "day-1",
        createdAt: basePayload.createdAt,
        firstAttemptAt,
        candidate: {
          name: "Matcha latte",
          amount: 650,
          currency: "Yen",
          dayIds: ["day-1"],
          start: "2026-10-27T15:42:00.000+09:00",
          // More than 2 minutes before firstAttemptAt
          createdTime: "2026-10-27T06:39:00.000Z",
        },
      }),
    ).toBe(false);
  });
});
