"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { geocodeJapan, lookupLandmark, searchPlacesJapan } from "@/lib/geocode";
import { ds, getNotion, textProp, titleProp } from "@/lib/notion";
import { parseSpendCurrency } from "@/lib/spend";
import { getDay } from "@/lib/trip";

function revalidateTrip() {
  revalidatePath("/");
  revalidatePath("/places");
  revalidatePath("/stays");
  revalidatePath("/transit");
  revalidatePath("/map");
  revalidatePath("/spend");
  revalidatePath("/lists");
  revalidatePath("/days", "layout");
}

function startValue(formData: FormData) {
  const start = String(formData.get("start") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();
  const dayDate = String(formData.get("dayDate") ?? "").trim().slice(0, 10);
  const raw = start || (time && dayDate ? `${dayDate}T${time}` : "");
  if (!raw) return "";
  if (/T\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  return raw;
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

export async function addDay(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  if (!name) return;
  const notion = getNotion();
  await notion.pages.create({
    parent: { data_source_id: ds("DAYS") },
    properties: {
      Name: titleProp(name),
      ...(date ? { Date: { date: { start: date } } } : {}),
      ...(city ? { City: { select: { name: city } } } : {}),
    },
  });
  revalidateTrip();
}

export async function updateDay(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  if (!id || !name) return;
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: {
      Name: titleProp(name),
      Date: { date: date ? { start: date } : null },
      City: { select: city ? { name: city } : null },
    },
  });
  revalidateTrip();
}

export async function deleteDay(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    in_trash: true,
  });
  revalidateTrip();
  redirect("/");
}

export async function addPlace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const mapsUrl = String(formData.get("mapsUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const start = startValue(formData);
  const order = orderValue(formData);
  const latRaw = String(formData.get("lat") ?? "").trim();
  const lngRaw = String(formData.get("lng") ?? "").trim();
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  const picked =
    latRaw && lngRaw && Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : null;
  if (!name) return;
  const notion = getNotion();
  const page = await notion.pages.create({
    parent: { data_source_id: ds("PLACES") },
    properties: {
      Name: titleProp(name),
      ...(type ? { Type: { select: { name: type } } } : {}),
      ...(mapsUrl ? { "Maps URL": { url: mapsUrl } } : {}),
      ...(notes ? { Notes: textProp(notes) } : {}),
      ...(dayId ? { Day: { relation: [{ id: dayId }] } } : {}),
      ...(start ? { Start: startProp(start) } : {}),
      ...(order !== null ? { Order: { number: order } } : {}),
      Pending: { checkbox: false },
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
  revalidateTrip();
}

export async function searchPlaces(query: string, city?: string) {
  return searchPlacesJapan(query, city);
}

export async function toggleVisited(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const visited = String(formData.get("visited") ?? "") === "true";
  if (!id) return;
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: { Visited: { checkbox: visited } },
  });
  revalidateTrip();
}

export async function updatePlaceNotes(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!id) return;
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: { Notes: textProp(notes) },
  });
  revalidateTrip();
}

async function trashPage(id: string) {
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    in_trash: true,
  });
  revalidateTrip();
}

export async function updatePlace(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const mapsUrl = String(formData.get("mapsUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const start = startValue(formData);
  const order = orderValue(formData);
  if (!id || !name) return;
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
      Order: { number: order },
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
  revalidateTrip();
}

export async function deletePlace(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await trashPage(id);
}

export async function confirmPendingPlace(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const start = String(formData.get("start") ?? "").trim();
  if (!id) return;
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: {
      Pending: { checkbox: false },
      ...(dayId ? { Day: { relation: [{ id: dayId }] } } : {}),
      ...(start ? { Start: startProp(start) } : {}),
    },
  });
  revalidateTrip();
}

export async function parkPlaceAsPending(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  if (!id) return;
  const notion = getNotion();
  await notion.pages.update({
    page_id: id,
    properties: {
      Pending: { checkbox: true },
      ...(dayId ? { Day: { relation: [{ id: dayId }] } } : {}),
      Start: startProp(null),
    },
  });
  revalidateTrip();
}

export async function updateTransit(formData: FormData) {
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
  if (!id || !name) return;
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
  revalidateTrip();
}

export async function deleteTransit(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await trashPage(id);
}

export async function addStay(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const checkIn = String(formData.get("checkIn") ?? "").trim();
  const checkOut = String(formData.get("checkOut") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const bookingUrl = String(formData.get("bookingUrl") ?? "").trim();
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (!name) return;
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
  revalidateTrip();
}

export async function addTransit(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  const from = String(formData.get("from") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const bookingUrl = String(formData.get("bookingUrl") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const start = startValue(formData);
  const order = orderValue(formData);
  if (!name) return;
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
  revalidateTrip();
}

export async function addSpend(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const kind = String(formData.get("kind") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const dayId = String(formData.get("dayId") ?? "").trim();
  const currency = parseSpendCurrency(String(formData.get("currency") ?? ""));
  const amount = Number(amountRaw);
  if (!name || !Number.isFinite(amount)) return;
  const notion = getNotion();
  await notion.pages.create({
    parent: { data_source_id: ds("SPEND") },
    properties: {
      Name: titleProp(name),
      Amount: { number: amount },
      Currency: { select: { name: currency } },
      ...(kind ? { Kind: { select: { name: kind } } } : {}),
      ...(category ? { Category: { select: { name: category } } } : {}),
      ...(notes ? { Notes: textProp(notes) } : {}),
      ...(dayId ? { Day: { relation: [{ id: dayId }] } } : {}),
    },
  });
  revalidateTrip();
}
