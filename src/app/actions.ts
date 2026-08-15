"use server";

import { revalidatePath } from "next/cache";
import { geocodeJapan, searchPlacesJapan } from "@/lib/geocode";
import { ds, getNotion, textProp, titleProp } from "@/lib/notion";
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
  return start || "";
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

export async function addPlace(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim();
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
      ...(area ? { Area: textProp(area) } : {}),
      ...(mapsUrl ? { "Maps URL": { url: mapsUrl } } : {}),
      ...(notes ? { Notes: textProp(notes) } : {}),
      ...(dayId ? { Day: { relation: [{ id: dayId }] } } : {}),
      ...(start ? { Start: { date: { start } } } : {}),
      ...(order !== null ? { Order: { number: order } } : {}),
      ...(picked
        ? { Lat: { number: picked.lat }, Lng: { number: picked.lng } }
        : {}),
    },
  });

  if (!picked) {
    const day = dayId ? await getDay(dayId) : null;
    const query = [name, area, day?.city].filter(Boolean).join(" ");
    const coords = await geocodeJapan(query);
    if (coords) {
      await notion.pages.update({
        page_id: page.id,
        properties: {
          Lat: { number: coords.lat },
          Lng: { number: coords.lng },
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
      ...(start ? { Start: { date: { start } } } : {}),
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
  const amount = Number(amountRaw);
  if (!name || !Number.isFinite(amount)) return;
  const notion = getNotion();
  await notion.pages.create({
    parent: { data_source_id: ds("SPEND") },
    properties: {
      Name: titleProp(name),
      Amount: { number: amount },
      ...(kind ? { Kind: { select: { name: kind } } } : {}),
      ...(category ? { Category: { select: { name: category } } } : {}),
      ...(notes ? { Notes: textProp(notes) } : {}),
      ...(dayId ? { Day: { relation: [{ id: dayId }] } } : {}),
    },
  });
  revalidateTrip();
}
