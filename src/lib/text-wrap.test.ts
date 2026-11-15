import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  compactMetaClass,
  compactPrimaryClass,
  compactTitleClass,
  textWrapClass,
} from "@/components/compact/classes";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const longTitle = "Nippombashi station -> namba osaka namba station";

const allowedTruncate = new Set([
  "src/components/bottom-nav.tsx",
  "src/components/overview-pull-refresh.tsx",
  "src/components/walking-nav-layer.tsx",
  "src/lib/spend-ingest-log.test.ts",
]);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, acc);
    else if (/\.(tsx|ts|css)$/.test(entry) && !entry.endsWith(".test.ts")) acc.push(path);
  }
  return acc;
}

describe("text wrap classes", () => {
  it("wraps long titles anywhere and does not truncate", () => {
    expect(textWrapClass).toContain("min-w-0");
    expect(textWrapClass).toContain("break-words");
    expect(textWrapClass).toContain("overflow-wrap:anywhere");
    expect(textWrapClass).not.toContain("truncate");
    expect(textWrapClass).not.toContain("whitespace-nowrap");

    for (const cls of [compactPrimaryClass, compactMetaClass, compactTitleClass]) {
      expect(cls).toContain("min-w-0");
      expect(cls).toContain("break-words");
      expect(cls).toContain("overflow-wrap:anywhere");
      expect(cls).not.toContain("truncate");
    }
  });

  it("keeps compact spend rows wrapping the example title at 375px", () => {
    const source = readFileSync(
      join(repoRoot, "src/components/spend-item-card.tsx"),
      "utf8",
    );
    expect(source).toContain(textWrapClass.split(" ")[0]);
    expect(source).toContain("${textWrapClass} flex-1 font-medium");
    expect(source).toContain("items-start");
    expect(source).toContain("shrink-0 text-right");
    expect(source).toContain("whitespace-nowrap tabular-nums");
    expect(source).not.toMatch(/truncate font-medium/);
    expect(source).not.toMatch(/className="[^"]*truncate[^"]*text-\[13px\]/);
    // Time + emoji + amount stay fixed; the name column must be able to shrink
    // and wrap inside a 375px row instead of overflowing.
    expect(longTitle.length).toBeGreaterThan(40);
    expect(source).toContain("min-w-0 flex-1");
  });

  it("does not leave title truncate in page UI except short chrome", () => {
    const hits: string[] = [];
    for (const file of walk(join(repoRoot, "src"))) {
      const rel = relative(repoRoot, file).replaceAll("\\", "/");
      if (allowedTruncate.has(rel)) continue;
      const text = readFileSync(file, "utf8");
      if (text.includes("truncate")) hits.push(rel);
    }
    expect(hits).toEqual([]);
  });
});
