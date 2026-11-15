import { createHmac, timingSafeEqual } from "node:crypto";

export const EDITOR_COOKIE = "trip_editor";

export function editorSecret() {
  return process.env.NOTION_TOKEN || "japan-trip-editor";
}

export function signEditorPayload(payload: string) {
  const sig = createHmac("sha256", editorSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyEditorToken(
  token: string | undefined | null,
): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", editorSecret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { name?: string; exp?: number };
    if (!data.name || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data.name;
  } catch {
    return null;
  }
}
