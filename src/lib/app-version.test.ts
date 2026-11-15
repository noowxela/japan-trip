import { describe, expect, it } from "vitest";
import { classifyAppUpdateCheck, shortCommit } from "@/lib/app-version";

describe("classifyAppUpdateCheck", () => {
  it("treats a missing or incomplete payload as an error", () => {
    expect(classifyAppUpdateCheck(null, "abc1234")).toBe("error");
    expect(classifyAppUpdateCheck(undefined, "abc1234")).toBe("error");
    expect(classifyAppUpdateCheck({ commit: "" }, "abc1234")).toBe("error");
  });

  it("detects an update when the commit differs, ignoring extra sha length", () => {
    expect(
      classifyAppUpdateCheck({ commit: "55c6694abcdef" }, "041953d"),
    ).toBe("update-available");
    expect(classifyAppUpdateCheck({ commit: "55c6694" }, "55c6694")).toBe(
      "up-to-date",
    );
    expect(
      classifyAppUpdateCheck({ commit: "55c6694abcdef" }, "55c6694"),
    ).toBe("up-to-date");
  });
});

describe("shortCommit", () => {
  it("keeps dev and trims a sha to 7 characters", () => {
    expect(shortCommit("dev")).toBe("dev");
    expect(shortCommit("  55c6694abcdef  ")).toBe("55c6694");
  });
});
