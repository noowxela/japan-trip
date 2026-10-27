"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { actionErr, actionOk, type ActionResult } from "@/lib/action-result";
import {
  clearEditorCookie,
  requireEditor,
  setEditorCookie,
  verifyEditorPin,
} from "@/lib/edit-session";
import { geocodeJapan, lookupLandmark, searchPlacesJapan } from "@/lib/geocode";
import { actionT } from "@/lib/i18n/action";
import { isLocale } from "@/lib/i18n/dictionaries";
import { LANG_COOKIE, LANG_MAX_AGE_SEC } from "@/lib/i18n/server";
import { ds, getNotion, textProp, titleProp } from "@/lib/notion";
import { parseSpendCurrency } from "@/lib/spend";
import {
  THEME_COOKIE,
  THEME_MAX_AGE_SEC,
  isThemePreference,
} from "@/lib/theme";
import { ensureTokyoOffset, tokyoWallDateTime } from "@/lib/format";
import { findSpendDuplicate, getDay, TRIP_TAGS } from "@/lib/trip";

function bump(...tags: string[]) {
  for (const tag of tags) updateTag(tag);
}

function startValue(formData: FormData) {
  const start = String(formData.get("start") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();
  const dayDate = String(formData.get("dayDate") ?? "").trim().slice(0, 10);
  if (start) return ensureTokyoOffset(start);
  if (time && dayDate) {
    const hm = time.length >= 5 ? time.slice(0, 5) : time;
    return tokyoWallDateTime(dayDate, hm);
  }
  return "";
}

function spendStartValue(formData: FormData) {
  return startValue(formData) || String(formData.get("dayDate") ?? "").trim().slice(0, 10);
}

function startProp(start: string | null) {
  if (!start) return { date: null };
  if (!start.includes("T")) return { date: { start } };
  return {
    date: {
      start,
      time_zone: "Asia/Tokyo",
    },
  };
}

function orderValue(formData: FormData) {
  const raw = String(formData.get("order") ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function pendingValue(formData: FormData) {
  return String(formData.get("pending") ?? "") === "true";
}

export async function setLocale(formData: FormData) {
  const lang = String(formData.get("lang") ?? "");
  if (!isLocale(lang)) return;
  const jar = await cookies();
  jar.set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: LANG_MAX_AGE_SEC,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function setTheme(formData: FormData) {
  const theme = String(formData.get("theme") ?? "");
  if (!isThemePreference(theme)) return;
  const jar = await cookies();
  jar.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: THEME_MAX_AGE_SEC,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function unlockEditor(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  if (!name || !pin) return actionErr(await actionT("action.namePinRequired"));
  const result = await verifyEditorPin(name, pin);
  if (!result.ok) return actionErr(result.error);
  await setEditorCookie(result.name);
  revalidatePath("/", "layout");
  return actionOk(await actionT("action.editingAs", { name: result.name }));
}

export async function lockEditor(): Promise<ActionResult> {
  await clearEditorCookie();
  revalidatePath("/", "layout");
  return actionOk(await actionT("action.editingLocked"));
}

export async function addDay(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  if (!name) return actionErr(await actionT("action.dayNameRequired"));
  const notion = getNotion();
  await notion.pages.create({
    parent: { data_source_id: ds("DAYS") },
    properties: {
      Name: titleProp(name),
      ...(date ? { Date: { date: { start: date } } } : {}),
      ...(city ? { City: { select: { name: city } } } : {}),
    },
  });
  bump(TRIP_TAGS.days);
  return actionOk(await actionT("action.dayAdded"));
}

export async function updateDay(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  if (!id || !name) return actionErr(await actionT("action.dayNameRequired"));
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: {
      Name: titleProp(name),
      Date: { date: date ? { start: date } : null },
      City: { select: city ? { name: city } : null },
    },
  });
  bump(TRIP_TAGS.days);
  return actionOk(await actionT("action.daySaved"));
}

export async function deleteDay(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return actionErr(await actionT("action.missingDay"));
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    in_trash: true,
  });
  bump(TRIP_TAGS.days);
  redirect("/days");
}

export async function addPlace(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const mapsUrl = String(formData.get("mapsUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const start = startValue(formData);
  const pending = pendingValue(formData);
  const latRaw = String(formData.get("lat") ?? "").trim();
  const lngRaw = String(formData.get("lng") ?? "").trim();
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const picked =
    latRaw && lngRaw && Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : null;
  if (!name) return actionErr(await actionT("action.placeNameRequired"));
  const notion = getNotion();
  const page = await notion.pages.create({
    parent: { data_source_id: ds("PLACES") },
    properties: {
      Name: titleProp(name),
      ...(type ? { Type: { select: { name: type } } } : {}),
      ...(mapsUrl ? { "Maps URL": { url: mapsUrl } } : {}),
      ...(notes ? { Notes: textProp(notes) } : {}),
      ...(dayId ? { Day: { relation: [{ id: dayId }] } } : {}),
      ...(start && !pending ? { Start: startProp(start) } : {}),
      Pending: { checkbox: pending },
      ...(picked
        ? { Lat: { number: picked.lat }, Lng: { number: picked.lng } }
        : {}),
    },
  });

  if (!picked) {
    const day = dayId ? await getDay(dayId) : null;
    const query = [name, day?.city].filter(Boolean).join(" ");
    const coords = await geocodeJapan(query, day?.city ?? undefined);
    if (coords) {
      await notion.pages.update({
        page_id: page.id,
        properties: {
          Lat: { number: coords.lat },
          Lng: { number: coords.lng },
          ...(coords.mapsUrl ? { "Maps URL": { url: coords.mapsUrl } } : {}),
        },
      });
    }
  }
  bump(TRIP_TAGS.places);
  return actionOk(await actionT(pending ? "action.maybeSaved" : "action.placeAdded"));
}

export async function searchPlaces(query: string, city?: string) {
  const locked = await requireEditor();
  if (locked) return [];
  return searchPlacesJapan(query, city);
}

export async function toggleVisited(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "");
  const visited = String(formData.get("visited") ?? "") === "true";
  if (!id) return actionErr(await actionT("action.missingPlace"));
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: { Visited: { checkbox: visited } },
  });
  bump(TRIP_TAGS.places);
  return actionOk(await actionT(visited ? "action.markedVisited" : "action.markedUnvisited"));
}

export async function updatePlaceNotes(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!id) return actionErr(await actionT("action.missingPlace"));
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: { Notes: textProp(notes) },
  });
  bump(TRIP_TAGS.places);
  return actionOk(await actionT("action.notesSaved"));
}

async function trashPage(id: string, tag: string) {
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    in_trash: true,
  });
  bump(tag);
}

export type RestoreEntity = "place" | "stay" | "transit" | "spend" | "prep";

const RESTORE_TAGS: Record<RestoreEntity, string> = {
  place: TRIP_TAGS.places,
  stay: TRIP_TAGS.stays,
  transit: TRIP_TAGS.transit,
  spend: TRIP_TAGS.spend,
  prep: TRIP_TAGS.prep,
};

/** Un-trash a Notion page after a reversible delete (Undo toast). */
export async function restorePage(
  id: string,
  entity: RestoreEntity,
): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const pageId = id.trim();
  if (!pageId) return actionErr(await actionT("action.missingId"));
  if (!(entity in RESTORE_TAGS)) {
    return actionErr(await actionT("action.missingId"));
  }
  const notion = getNotion();
  await notion.pages.update({
    page_id: pageId,
    in_trash: false,
  });
  bump(RESTORE_TAGS[entity]);
  return actionOk(await actionT("action.restored"));
}

export async function updatePlace(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const mapsUrl = String(formData.get("mapsUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const start = startValue(formData);
  if (!id || !name) return actionErr(await actionT("action.placeNameRequired"));
  const notion = getNotion();
  const known = lookupLandmark(name);
  await notion.pages.update({
    page_id: id,
    properties: {
      Name: titleProp(name),
      Type: { select: type ? { name: type } : null },
      "Maps URL": { url: mapsUrl || known?.mapsUrl || null },
      Notes: textProp(notes),
      Day: { relation: dayId ? [{ id: dayId }] : [] },
      Start: startProp(start || null),
      Pending: { checkbox: false },
      ...(known
        ? { Lat: { number: known.lat }, Lng: { number: known.lng } }
        : {}),
    },
  });
  if (!known && !mapsUrl) {
    const day = dayId ? await getDay(dayId) : null;
    const coords = await geocodeJapan(
      [name, day?.city].filter(Boolean).join(" "),
      day?.city ?? undefined,
    );
    if (coords) {
      await notion.pages.update({
        page_id: id,
        properties: {
          Lat: { number: coords.lat },
          Lng: { number: coords.lng },
          "Maps URL": { url: coords.mapsUrl },
        },
      });
    }
  }
  bump(TRIP_TAGS.places);
  return actionOk(await actionT("action.placeSaved"));
}

export async function deletePlace(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return actionErr(await actionT("action.missingPlace"));
  await trashPage(id, TRIP_TAGS.places);
  return actionOk(await actionT("action.placeDeleted"));
}

export async function confirmPendingPlace(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const start = String(formData.get("start") ?? "").trim();
  if (!id) return actionErr(await actionT("action.missingPlace"));
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: {
      Pending: { checkbox: false },
      ...(dayId ? { Day: { relation: [{ id: dayId }] } } : {}),
      ...(start ? { Start: startProp(start) } : {}),
    },
  });
  bump(TRIP_TAGS.places);
  return actionOk(await actionT("action.addedToAgenda"));
}

export async function parkPlaceAsPending(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  if (!id) return actionErr(await actionT("action.missingPlace"));
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: {
      Pending: { checkbox: true },
      ...(dayId ? { Day: { relation: [{ id: dayId }] } } : {}),
      Start: startProp(null),
    },
  });
  bump(TRIP_TAGS.places);
  return actionOk(await actionT("action.movedToPending"));
}

export async function updateTransit(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  const from = String(formData.get("from") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const bookingUrl = String(formData.get("bookingUrl") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const start = startValue(formData);
  const order = orderValue(formData);
  if (!id || !name) return actionErr(await actionT("action.transitNameRequired"));
  const notion = getNotion();
  const dateStart = date || (start ? start.slice(0, 10) : "");
  await notion.pages.update({
    page_id: id,
    properties: {
      Name: titleProp(name),
      Mode: { select: mode ? { name: mode } : null },
      From: textProp(from),
      To: textProp(to),
      Date: { date: dateStart ? { start: dateStart } : null },
      "Booking URL": { url: bookingUrl || null },
      Day: { relation: dayId ? [{ id: dayId }] : [] },
      Start: startProp(start || null),
      Order: { number: order },
    },
  });
  bump(TRIP_TAGS.transit);
  return actionOk(await actionT("action.transitSaved"));
}

export async function deleteTransit(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return actionErr(await actionT("action.missingTransit"));
  await trashPage(id, TRIP_TAGS.transit);
  return actionOk(await actionT("action.transitDeleted"));
}

export async function addStay(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const name = String(formData.get("name") ?? "").trim();
  const checkIn = String(formData.get("checkIn") ?? "").trim();
  const checkOut = String(formData.get("checkOut") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const bookingUrl = String(formData.get("bookingUrl") ?? "").trim();
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (!name) return actionErr(await actionT("action.stayNameRequired"));
  const notion = getNotion();
  await notion.pages.create({
    parent: { data_source_id: ds("STAYS") },
    properties: {
      Name: titleProp(name),
      ...(checkIn ? { "Check-in": { date: { start: checkIn } } } : {}),
      ...(checkOut ? { "Check-out": { date: { start: checkOut } } } : {}),
      ...(address ? { Address: textProp(address) } : {}),
      ...(bookingUrl ? { "Booking URL": { url: bookingUrl } } : {}),
      ...(confirmation ? { Confirmation: textProp(confirmation) } : {}),
    },
  });
  bump(TRIP_TAGS.stays);
  return actionOk(await actionT("action.stayAdded"));
}

export async function updateStay(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const checkIn = String(formData.get("checkIn") ?? "").trim();
  const checkOut = String(formData.get("checkOut") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const bookingUrl = String(formData.get("bookingUrl") ?? "").trim();
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (!id || !name) return actionErr(await actionT("action.stayNameRequired"));
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: {
      Name: titleProp(name),
      "Check-in": { date: checkIn ? { start: checkIn } : null },
      "Check-out": { date: checkOut ? { start: checkOut } : null },
      Address: textProp(address),
      "Booking URL": { url: bookingUrl || null },
      Confirmation: textProp(confirmation),
    },
  });
  bump(TRIP_TAGS.stays);
  return actionOk(await actionT("action.staySaved"));
}

export async function deleteStay(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return actionErr(await actionT("action.missingStay"));
  await trashPage(id, TRIP_TAGS.stays);
  return actionOk(await actionT("action.stayDeleted"));
}

export async function addTransit(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const name = String(formData.get("name") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  const from = String(formData.get("from") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const bookingUrl = String(formData.get("bookingUrl") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const start = startValue(formData);
  const order = orderValue(formData);
  if (!name) return actionErr(await actionT("action.transitNameRequired"));
  const notion = getNotion();
  await notion.pages.create({
    parent: { data_source_id: ds("TRANSIT") },
    properties: {
      Name: titleProp(name),
      ...(mode ? { Mode: { select: { name: mode } } } : {}),
      ...(from ? { From: textProp(from) } : {}),
      ...(to ? { To: textProp(to) } : {}),
      ...(date ? { Date: { date: { start: date } } } : {}),
      ...(bookingUrl ? { "Booking URL": { url: bookingUrl } } : {}),
      ...(dayId ? { Day: { relation: [{ id: dayId }] } } : {}),
      ...(start ? { Start: startProp(start) } : {}),
      ...(order !== null ? { Order: { number: order } } : {}),
    },
  });
  bump(TRIP_TAGS.transit);
  return actionOk(await actionT("action.transitAdded"));
}

export async function addSpend(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const name = String(formData.get("name") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const paidBy = String(formData.get("paidBy") ?? "").trim();
  const currency = parseSpendCurrency(String(formData.get("currency") ?? ""));
  const amount = Number(amountRaw);
  const clientCreatedAt = String(formData.get("clientCreatedAt") ?? "").trim();
  const dedupe = String(formData.get("dedupe") ?? "").trim() === "1";
  const firstAttemptAt = String(formData.get("firstAttemptAt") ?? "").trim();
  const start = clientCreatedAt
    ? ensureTokyoOffset(clientCreatedAt)
    : spendStartValue(formData);
  if (!name) return actionErr(await actionT("action.spendNameRequired"));
  if (!Number.isFinite(amount)) return actionErr(await actionT("action.amountRequired"));
  // Dedupe only on outbox retries (lost response after the request reached Notion).
  if (dedupe && clientCreatedAt && firstAttemptAt) {
    const existing = await findSpendDuplicate({
      name,
      amount,
      currency,
      dayId,
      createdAt: clientCreatedAt,
      firstAttemptAt,
    });
    if (existing) {
      bump(TRIP_TAGS.spend);
      return actionOk(await actionT("action.spendAdded"), existing.id);
    }
  }
  const notion = getNotion();
  const created = await notion.pages.create({
    parent: { data_source_id: ds("SPEND") },
    properties: {
      Name: titleProp(name),
      Amount: { number: amount },
      Currency: { select: { name: currency } },
      ...(kind ? { Kind: { select: { name: kind } } } : {}),
      ...(category ? { Category: { select: { name: category } } } : {}),
      ...(notes ? { Notes: textProp(notes) } : {}),
      ...(dayId ? { Day: { relation: [{ id: dayId }] } } : {}),
      ...(start ? { Start: startProp(start) } : {}),
      ...(paidBy ? { "Paid by": { select: { name: paidBy } } } : {}),
    },
  });
  bump(TRIP_TAGS.spend);
  return actionOk(await actionT("action.spendAdded"), created.id);
}

export async function updateSpend(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const paidBy = String(formData.get("paidBy") ?? "").trim();
  const currency = parseSpendCurrency(String(formData.get("currency") ?? ""));
  const amount = Number(amountRaw);
  const start = spendStartValue(formData);
  if (!id || !name) return actionErr(await actionT("action.spendNameRequired"));
  if (!Number.isFinite(amount)) return actionErr(await actionT("action.amountRequired"));
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: {
      Name: titleProp(name),
      Amount: { number: amount },
      Currency: { select: { name: currency } },
      Kind: { select: kind ? { name: kind } : null },
      Category: { select: category ? { name: category } : null },
      Notes: textProp(notes),
      Day: { relation: dayId ? [{ id: dayId }] : [] },
      Start: startProp(start || null),
      "Paid by": { select: paidBy ? { name: paidBy } : null },
    },
  });
  bump(TRIP_TAGS.spend);
  return actionOk(await actionT("action.spendSaved"));
}

export async function deleteSpend(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return actionErr(await actionT("action.missingSpend"));
  await trashPage(id, TRIP_TAGS.spend);
  return actionOk(await actionT("action.spendDeleted"));
}

export async function addPrepItem(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const name = String(formData.get("name") ?? "").trim();
  const order = orderValue(formData);
  if (!name) return actionErr(await actionT("action.prepRequired"));
  const notion = getNotion();
  await notion.pages.create({
    parent: { data_source_id: ds("PREP") },
    properties: {
      Name: titleProp(name),
      Done: { checkbox: false },
      ...(order !== null ? { Order: { number: order } } : {}),
    },
  });
  bump(TRIP_TAGS.prep);
  return actionOk(await actionT("action.prepAdded"));
}

export async function togglePrepItem(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  const done = String(formData.get("done") ?? "") === "true";
  if (!id) return actionErr(await actionT("action.missingPrep"));
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: { Done: { checkbox: done } },
  });
  bump(TRIP_TAGS.prep);
  return actionOk();
}

export async function deletePrepItem(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return actionErr(await actionT("action.missingPrep"));
  await trashPage(id, TRIP_TAGS.prep);
  return actionOk(await actionT("action.prepRemoved"));
}

export async function movePendingToDay(formData: FormData): Promise<ActionResult> {
  const locked = await requireEditor();
  if (locked) return locked;
  const id = String(formData.get("id") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  if (!id || !dayId) return actionErr(await actionT("action.missingPlaceOrDay"));
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: {
      Day: { relation: [{ id: dayId }] },
    },
  });
  bump(TRIP_TAGS.places);
  return actionOk(await actionT("action.movedToDay"));
}
