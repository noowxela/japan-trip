import { describe, expect, it } from "vitest";
import {
  isThemePreference,
  parseThemePreference,
  themeBootScript,
} from "@/lib/theme";

describe("theme preference", () => {
  it("parses known values and defaults to system", () => {
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("nope")).toBe(false);
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference(undefined)).toBe("system");
  });

  it("boot script mentions preference and matchMedia", () => {
    const script = themeBootScript("system");
    expect(script).toContain("system");
    expect(script).toContain("prefers-color-scheme");
    expect(script).toContain("data-theme");
  });
});
