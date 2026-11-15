import { describe, expect, it } from "vitest";
import {
  errorDigest,
  errorMessage,
  formatPageErrorDetails,
  pageErrorCopy,
  pageErrorKind,
} from "@/lib/page-error";

describe("pageErrorKind / pageErrorCopy", () => {
  it("uses generic copy for ordinary page crashes", () => {
    const error = new Error(
      "The result of getSnapshot should be cached to avoid an infinite loop",
    );
    expect(pageErrorKind(error)).toBe("generic");
    const copy = pageErrorCopy(error);
    expect(copy.titleZh).toBe("页面出错了");
    expect(copy.bodyZh).toBe("重新加载后再试一次。");
    expect(copy.bodyEn).toBe("Something went wrong. Reload, then try again.");
    expect(copy.bodyZh).not.toContain("花费");
    expect(copy.bodyEn.toLowerCase()).not.toContain("expense");
  });

  it("uses spend copy when Notion returns an ERROR code", () => {
    const error = new Error("Notion failed: ERROR 1112746976");
    expect(pageErrorKind(error)).toBe("spend");
    const copy = pageErrorCopy(error);
    expect(copy.bodyZh).toBe("这笔花费没有保存。重新加载后再试一次。");
    expect(copy.bodyEn).toBe("This expense was not saved. Reload, then try again.");
  });

  it("uses spend copy when the thrown message is already a spend failure", () => {
    expect(pageErrorKind(new Error("Couldn't save this expense. Timeout"))).toBe(
      "spend",
    );
    expect(pageErrorKind("这笔花费没有保存。可以再试一次。")).toBe("spend");
  });
});

describe("formatPageErrorDetails", () => {
  it("includes the message, digest, and stack", () => {
    const error = new Error("Clothes snapshot was unstable");
    error.stack = "Error: Clothes snapshot was unstable\n    at ClothesView";
    Object.assign(error, { digest: "abc123" });
    const details = formatPageErrorDetails(error);
    expect(details).toContain("Clothes snapshot was unstable");
    expect(details).toContain("digest: abc123");
    expect(details).toContain("at ClothesView");
  });

  it("includes a digest even when the value is not an Error instance", () => {
    const details = formatPageErrorDetails({
      message: "Server component failed",
      digest: "NEXT_DIGEST",
    });
    expect(details).toContain("Server component failed");
    expect(details).toContain("digest: NEXT_DIGEST");
  });

  it("returns an empty string when there is nothing useful to show", () => {
    expect(formatPageErrorDetails(undefined)).toBe("");
    expect(formatPageErrorDetails(null)).toBe("");
  });
});

describe("errorMessage / errorDigest", () => {
  it("reads message and digest from loose objects", () => {
    expect(errorMessage({ message: "boom" })).toBe("boom");
    expect(errorDigest({ digest: "  d1  " })).toBe("d1");
    expect(errorDigest(new Error("x"))).toBe("");
  });
});
