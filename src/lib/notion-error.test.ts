import { describe, expect, it } from "vitest";
import { isNotionInternalCode, notionErrorCode } from "@/lib/notion-error";

describe("notionErrorCode", () => {
  it("reads the live spend-save failure code", () => {
    expect(notionErrorCode("ERROR 1112746976")).toBe("ERROR 1112746976");
    expect(notionErrorCode("  error 1112746976  ")).toBe("ERROR 1112746976");
    expect(isNotionInternalCode("ERROR 1112746976")).toBe(true);
  });

  it("ignores ordinary validation text", () => {
    expect(notionErrorCode("body failed validation")).toBeNull();
    expect(isNotionInternalCode("Spend name is required")).toBe(false);
  });
});
