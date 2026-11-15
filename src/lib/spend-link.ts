import { toRm } from "@/lib/spend";
import {
  JPY_PER_RM,
  SPEND_CATEGORIES,
  type Place,
  type SpendCurrency,
  type SpendItem,
  type Transit,
} from "@/lib/types";

export type ScheduleLinkKind = "place" | "transit";

export type ScheduleLinkRef = {
  kind: ScheduleLinkKind;
  id: string;
};

export type ScheduleLinkOption = ScheduleLinkRef & {
  name: string;
  chip: string | null;
};

export function normalizeScheduleLink(
  placeId?: string | null,
  transitId?: string | null,
): { placeId: string; transitId: string } {
  const place = placeId?.trim() ?? "";
  const transit = transitId?.trim() ?? "";
  if (place && transit) return { placeId: "", transitId: transit };
  return { placeId: place, transitId: transit };
}

export function encodeScheduleLink(
  placeId?: string | null,
  transitId?: string | null,
): string {
  const link = normalizeScheduleLink(placeId, transitId);
  if (link.transitId) return `transit:${link.transitId}`;
  if (link.placeId) return `place:${link.placeId}`;
  return "";
}

export function decodeScheduleLink(value: string): {
  placeId: string;
  transitId: string;
} {
  const raw = value.trim();
  if (raw.startsWith("place:")) {
    return { placeId: raw.slice("place:".length).trim(), transitId: "" };
  }
  if (raw.startsWith("transit:")) {
    return { placeId: "", transitId: raw.slice("transit:".length).trim() };
  }
  return { placeId: "", transitId: "" };
}

/** Same-day schedule stops a spend can link to (not pending, not skipped). */
export function scheduleItemsForDay(
  places: Place[],
  transit: Transit[],
  dayId: string,
): ScheduleLinkOption[] {
  if (!dayId) return [];
  const placeRows = places
    .filter(
      (place) =>
        !place.skipped && !place.pending && place.dayIds.includes(dayId),
    )
    .map((place) => ({
      kind: "place" as const,
      id: place.id,
      name: place.name,
      chip: place.type,
    }));
  const transitRows = transit
    .filter((item) => !item.skipped && item.dayIds.includes(dayId))
    .map((item) => ({
      kind: "transit" as const,
      id: item.id,
      name: item.name,
      chip: item.mode,
    }));
  return [...placeRows, ...transitRows].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function spendsForScheduleItem(
  spends: SpendItem[],
  ref: ScheduleLinkRef,
): SpendItem[] {
  return spends.filter((item) =>
    ref.kind === "place"
      ? item.placeId === ref.id
      : item.transitId === ref.id,
  );
}

export function linkedSpendTotals(
  spends: SpendItem[],
  jpyPerRm = JPY_PER_RM,
): { count: number; rm: number; yen: number } {
  const rm = spends.reduce(
    (sum, item) => sum + toRm(item.amount, item.currency, jpyPerRm),
    0,
  );
  return { count: spends.length, rm, yen: Math.round(rm * jpyPerRm) };
}

export function linkedScheduleOf(
  item: Pick<SpendItem, "placeId" | "transitId">,
  places: Place[],
  transit: Transit[],
): ScheduleLinkOption | { kind: ScheduleLinkKind; id: string; missing: true } | null {
  const link = normalizeScheduleLink(item.placeId, item.transitId);
  if (link.transitId) {
    const found = transit.find((row) => row.id === link.transitId);
    if (!found) return { kind: "transit", id: link.transitId, missing: true };
    return {
      kind: "transit",
      id: found.id,
      name: found.name,
      chip: found.mode,
    };
  }
  if (link.placeId) {
    const found = places.find((row) => row.id === link.placeId);
    if (!found) return { kind: "place", id: link.placeId, missing: true };
    return {
      kind: "place",
      id: found.id,
      name: found.name,
      chip: found.type,
    };
  }
  return null;
}

export function linkedScheduleLabel(
  item: Pick<SpendItem, "placeId" | "transitId">,
  places: Place[],
  transit: Transit[],
): { name: string; missing: boolean } | null {
  const linked = linkedScheduleOf(item, places, transit);
  if (!linked) return null;
  if ("missing" in linked && linked.missing) return { name: "", missing: true };
  if ("name" in linked) return { name: linked.name, missing: false };
  return { name: "", missing: true };
}

export function suggestedSpendCategory(item: {
  kind: "place" | "transit";
  chip: string | null;
}): (typeof SPEND_CATEGORIES)[number] {
  if (item.kind === "transit") {
    if (item.chip === "Ride-hailing") return "Ride-hailing";
    if (item.chip === "Flight") return "Airfare";
    return "Transit";
  }
  if (item.chip === "Food" || item.chip === "Cafe") return "Food";
  if (item.chip === "Shop") return "Shop";
  return "Other";
}

export function suggestedSpendCurrency(
  category: string | null | undefined,
): SpendCurrency | undefined {
  return category === "Ride-hailing" ? "RM" : undefined;
}

