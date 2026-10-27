import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const root = path.dirname(fileURLToPath(import.meta.url));

function shortCommit(commit: string): string {
  const trimmed = commit.trim();
  if (!trimmed || trimmed === "dev") return "dev";
  return trimmed.slice(0, 7);
}

function resolveCommit(): string {
  const fromEnv =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_APP_COMMIT;
  if (fromEnv) return fromEnv;
  try {
    return execSync("git rev-parse HEAD", {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "dev";
  }
}

const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
  version: string;
};

const nextConfig: NextConfig = {
  // A phone on the same Wi-Fi opens the dev server by LAN IP. Next.js blocks
  // /_next scripts from any host other than localhost unless it is listed here.
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    ...Array.from({ length: 16 }, (_, index) => `172.${16 + index}.*.*`),
  ],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_COMMIT: shortCommit(resolveCommit()),
  },
  turbopack: {
    root,
  },
  async redirects() {
    return [
      { source: "/budget/new", destination: "/budget", permanent: false },
      { source: "/spend", destination: "/budget", permanent: false },
      {
        source: "/today",
        destination: "/schedule?day=today&mode=now",
        permanent: false,
      },
      {
        source: "/days/:id",
        destination: "/schedule?day=:id",
        permanent: false,
      },
    ];
  },
};

export default withSerwist(nextConfig);
