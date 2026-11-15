import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { actionErr, type ActionResult } from "@/lib/action-result";
import {
  EDITOR_COOKIE,
  editorSecret,
  signEditorPayload,
  verifyEditorToken,
} from "@/lib/editor-token";
import { actionT } from "@/lib/i18n/action";
import {
  ds,
  hasEditorsDs,
  queryAll,
  richTextOf,
  titleOf,
} from "@/lib/notion";

const MAX_AGE_SEC = 14 * 24 * 60 * 60;

export type EditorSession = {
  canEdit: boolean;
  editorName: string | null;
};

function pinDigest(pin: string) {
  return createHmac("sha256", editorSecret()).update(`pin:${pin}`).digest();
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
  const token = jar.get(EDITOR_COOKIE)?.value;
  if (!token) return { canEdit: false, editorName: null };
  const name = verifyEditorToken(token);
  if (!name) return { canEdit: false, editorName: null };
  return { canEdit: true, editorName: name };
}

export async function requireEditor(): Promise<ActionResult | null> {
  const session = await getEditorSession();
  if (session.canEdit) return null;
  return actionErr(await actionT("action.unlockRequired"), "editor_required");
}

export async function setEditorCookie(name: string) {
  const payload = Buffer.from(
    JSON.stringify({ name, exp: Date.now() + MAX_AGE_SEC * 1000 }),
  ).toString("base64url");
  const jar = await cookies();
  jar.set(EDITOR_COOKIE, signEditorPayload(payload), cookieOptions());
}

export async function clearEditorCookie() {
  const jar = await cookies();
  jar.set(EDITOR_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
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
    return { ok: false, error: await actionT("action.addEditorFirst") };
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
  return { ok: false, error: await actionT("action.wrongPin") };
}
