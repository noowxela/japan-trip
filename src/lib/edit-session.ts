import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { actionErr, type ActionResult } from "@/lib/action-result";
import {
  ds,
  hasEditorsDs,
  queryAll,
  richTextOf,
  titleOf,
} from "@/lib/notion";

const COOKIE = "trip_editor";
const MAX_AGE_SEC = 14 * 24 * 60 * 60;

export type EditorSession = {
  canEdit: boolean;
  editorName: string | null;
};

function secret() {
  return process.env.NOTION_TOKEN || "japan-trip-editor";
}

function pinDigest(pin: string) {
  return createHmac("sha256", secret()).update(`pin:${pin}`).digest();
}

function sign(payload: string) {
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verify(token: string) {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret())
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

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function getEditorSession(): Promise<EditorSession> {
  if (!hasEditorsDs()) {
    return { canEdit: true, editorName: null };
  }
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return { canEdit: false, editorName: null };
  const name = verify(token);
  if (!name) return { canEdit: false, editorName: null };
  return { canEdit: true, editorName: name };
}

export async function requireEditor(): Promise<ActionResult | null> {
  const session = await getEditorSession();
  if (session.canEdit) return null;
  return actionErr("Unlock editing in Settings");
}

export async function setEditorCookie(name: string) {
  const payload = Buffer.from(
    JSON.stringify({ name, exp: Date.now() + MAX_AGE_SEC * 1000 }),
  ).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, sign(payload), cookieOptions());
}

export async function clearEditorCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

function namesMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export async function verifyEditorPin(
  name: string,
  pin: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  if (!hasEditorsDs()) {
    return { ok: true, name: name.trim() || "Editor" };
  }
  const pages = await queryAll(ds("EDITORS"));
  if (pages.length === 0) {
    return { ok: false, error: "Add an editor row in Notion first" };
  }
  const wantPin = pinDigest(pin);
  for (const page of pages) {
    const rowName = titleOf(page);
    const rowPin = richTextOf(page, "PIN");
    if (!rowPin || !namesMatch(rowName, name)) continue;
    const got = pinDigest(rowPin);
    if (got.length === wantPin.length && timingSafeEqual(got, wantPin)) {
      return { ok: true, name: rowName };
    }
  }
  return { ok: false, error: "Name or PIN is wrong" };
}
