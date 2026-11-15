import { describe, expect, it } from "vitest";
import {
  isNotionInternalCode,
  isStayMapsSchemaError,
  notionErrorCode,
} from "@/lib/notion-error";

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

describe("isStayMapsSchemaError", () => {
  it("detects missing Maps URL / Lat / Lng validation messages", () => {
    expect(
      isStayMapsSchemaError(
        new Error("Maps URL is not a property that exists."),
      ),
    ).toBe(true);
    expect(
      isStayMapsSchemaError({
        message: "Lat is not a property that exists.",
      }),
    ).toBe(true);
    expect(
      isStayMapsSchemaError(
        "body failed validation: Lng is not a property that exists",
      ),
    ).toBe(true);
  });

  it("ignores unrelated failures", () => {
    expect(isStayMapsSchemaError(new Error("ERROR 1112746976"))).toBe(false);
    expect(isStayMapsSchemaError(new Error("Stay name is required"))).toBe(
      false,
    );
    expect(isStayMapsSchemaError(null)).toBe(false);
  });
});
