import { describe, expect, it } from "vitest";
import {
  spendPartyChipClass,
  spendPartyFieldClass,
  spendPartyRowClass,
} from "@/lib/spend-party-row";

describe("spend party row", () => {
  it("keeps payer and split on one wrapping 2-col row that can shrink at 375px", () => {
    expect(spendPartyRowClass).toContain("grid-cols-2");
    expect(spendPartyRowClass).toContain("min-w-0");
    expect(spendPartyFieldClass).toContain("min-w-0");
    expect(spendPartyChipClass).toContain("h-8");
    expect(spendPartyChipClass).toContain("text-xs");
    expect(spendPartyChipClass).toContain("flex");
  });
});
