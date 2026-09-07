export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const APP_COMMIT = shortCommit(process.env.NEXT_PUBLIC_APP_COMMIT ?? "dev");

export type AppVersionPayload = {
  version: string;
  commit: string;
};

export function shortCommit(commit: string): string {
  const trimmed = commit.trim();
  if (!trimmed || trimmed === "dev") return "dev";
  return trimmed.slice(0, 7);
}

export function getDeployCommit(): string {
  return shortCommit(
    process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.NEXT_PUBLIC_APP_COMMIT ??
      "dev",
  );
}

export function getDeployVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION ?? APP_VERSION;
}

export function formatAppVersion(
  version = APP_VERSION,
  commit = APP_COMMIT,
): string {
  return `v${version} · ${commit}`;
}
