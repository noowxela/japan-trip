"use client";

import nextDynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { addPlace, searchPlaces } from "@/app/actions";
import { formShellClass } from "@/components/page-shell";
import { PLACE_TYPES, type TripDay } from "@/lib/types";
import type { PlaceSearchHit } from "@/lib/geocode";

const PlacePreviewMap = nextDynamic(
  () => import("@/components/place-preview-map").then((mod) => mod.PlacePreviewMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-xl border border-stone-200 text-xs text-stone-500">
        Map…
      </div>
    ),
  },
);

export function AddPlaceForm({
  days,
  defaultDayId,
}: {
  days: TripDay[];
  defaultDayId?: string;
}) {
  const [query, setQuery] = useState("");
  const [dayId, setDayId] = useState(defaultDayId ?? "");
  const [results, setResults] = useState<PlaceSearchHit[]>([]);
  const [picked, setPicked] = useState<PlaceSearchHit | null>(null);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, startSearch] = useTransition();

  const city = useMemo(
    () => days.find((day) => day.id === dayId)?.city ?? undefined,
    [days, dayId],
  );

  function onSearch() {
    setError("");
    startSearch(async () => {
      const hits = await searchPlaces(query, city);
      setResults(hits);
      if (hits.length === 0) setError("No map results. Try a Japanese or English name.");
    });
  }

  function pick(hit: PlaceSearchHit) {
    setPicked(hit);
    setName(hit.name);
    if (hit.area) setArea(hit.area);
    setMapsUrl(hit.mapsUrl);
    setResults([]);
  }

  return (
    <div className={`${formShellClass} grid gap-3 rounded-2xl border border-stone-200 bg-white p-4`}>
      <p className="font-medium text-stone-900">Add a place</p>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearch();
            }
          }}
          placeholder="Search map: Senso-ji, Ichiran…"
          className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={pending || query.trim().length < 2}
          className="shrink-0 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "…" : "Search"}
        </button>
      </div>
      {error ? <p className="text-xs text-stone-500">{error}</p> : null}
      {results.length > 0 ? (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
          {results.map((hit) => (
            <li key={`${hit.lat}-${hit.lng}-${hit.displayName}`}>
              <button
                type="button"
                onClick={() => pick(hit)}
                className="w-full px-3 py-2 text-left hover:bg-stone-50"
              >
                <p className="text-sm font-medium">{hit.name}</p>
                <p className="text-xs text-stone-500">{hit.displayName}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {picked ? (
        <div className="space-y-2">
          <PlacePreviewMap lat={picked.lat} lng={picked.lng} />
          <p className="text-xs text-stone-500">{picked.displayName}</p>
        </div>
      ) : null}

      <form action={addPlace} className="grid gap-3">
        <input type="hidden" name="lat" value={picked?.lat ?? ""} />
        <input type="hidden" name="lng" value={picked?.lng ?? ""} />
        <input
          name="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Senso-ji"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            name="type"
            defaultValue="Sight"
            className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
          >
            {PLACE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            name="area"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            placeholder="Asakusa"
            className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
          />
        </div>
        <input
          name="mapsUrl"
          type="url"
          value={mapsUrl}
          onChange={(event) => setMapsUrl(event.target.value)}
          placeholder="Maps URL"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
        <select
          name="dayId"
          value={dayId}
          onChange={(event) => setDayId(event.target.value)}
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        >
          <option value="">No day yet</option>
          {days.map((day) => (
            <option key={day.id} value={day.id}>
              {day.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="start"
            type="datetime-local"
            className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
          />
          <input
            name="order"
            type="number"
            placeholder="Order"
            className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
          />
        </div>
        <textarea
          name="notes"
          rows={2}
          placeholder="Notes"
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
        <button
          type="submit"
          className="rounded-full bg-[#b42318] px-4 py-2 text-sm font-medium text-white"
        >
          Add place
        </button>
      </form>
    </div>
  );
}
