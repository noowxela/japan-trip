"use client";

import { useMemo, useState, useTransition } from "react";
import { addPlace, addTransit, searchPlaces } from "@/app/actions";
import { dateKey } from "@/lib/format";
import type { PlaceSearchHit } from "@/lib/geocode";
import {
  PLACE_TYPES,
  TRANSIT_MODES,
  type TripDay,
} from "@/lib/types";

const field =
  "rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-[#b42318]";

type Kind = "place" | "transit";

export function AddAgendaForm({
  days,
  defaultDayId,
  dayDate,
}: {
  days: TripDay[];
  defaultDayId: string;
  dayDate: string | null;
}) {
  const [kind, setKind] = useState<Kind>("place");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchHit[]>([]);
  const [picked, setPicked] = useState<PlaceSearchHit | null>(null);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [error, setError] = useState("");
  const [pending, startSearch] = useTransition();
  const city = useMemo(
    () => days.find((day) => day.id === defaultDayId)?.city ?? undefined,
    [days, defaultDayId],
  );
  const date = dateKey(dayDate) ?? "";

  function onSearch() {
    setError("");
    startSearch(async () => {
      const hits = await searchPlaces(query, city);
      setResults(hits);
      if (hits.length === 0) {
        setError("No map results. Try a Japanese or English name.");
      }
    });
  }

  function pick(hit: PlaceSearchHit) {
    setPicked(hit);
    setName(hit.name);
    if (hit.area) setArea(hit.area);
    setResults([]);
  }

  return (
    <form
      action={kind === "place" ? addPlace : addTransit}
      className="grid min-w-0 gap-3 rounded-2xl border border-stone-200 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-stone-900">Add to agenda</p>
        <div className="flex gap-1">
          {(["place", "transit"] as const).map((option) => {
            const selected = kind === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => setKind(option)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  selected
                    ? "bg-[#b42318] text-white"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <input type="hidden" name="dayId" value={defaultDayId} />
      <input type="hidden" name="dayDate" value={date} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="lat" value={picked?.lat ?? ""} />
      <input type="hidden" name="lng" value={picked?.lng ?? ""} />
      <input type="hidden" name="mapsUrl" value={picked?.mapsUrl ?? ""} />

      {kind === "place" ? (
        <>
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
              placeholder="Search map"
              className={`min-w-0 flex-1 ${field}`}
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
        </>
      ) : null}

      <input
        name="name"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={kind === "place" ? "Place name" : "Train / flight name"}
        className={field}
      />

      {kind === "place" ? (
        <div className="grid grid-cols-2 gap-3">
          <select name="type" defaultValue="Sight" className={field}>
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
            placeholder="Area"
            className={field}
          />
        </div>
      ) : (
        <>
          <select name="mode" defaultValue="Metro" className={field}>
            {TRANSIT_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input name="from" placeholder="From" className={field} />
            <input name="to" placeholder="To" className={field} />
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <input
          name="time"
          type="time"
          step="60"
          className={`${field} cursor-pointer`}
          onClick={(event) => {
            const input = event.currentTarget;
            if (typeof input.showPicker !== "function") return;
            try {
              input.showPicker();
            } catch {
              // Browser may already have the picker open.
            }
          }}
        />
        <input name="order" type="number" placeholder="Order" className={field} />
      </div>

      <button
        type="submit"
        className="rounded-full bg-[#b42318] px-4 py-2 text-sm font-medium text-white"
      >
        {kind === "place" ? "Add place" : "Add transit"}
      </button>
    </form>
  );
}
