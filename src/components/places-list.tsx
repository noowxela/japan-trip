"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { MapsPinLink } from "@/components/maps-pin-link";
import { NotesForm } from "@/components/notes-form";
import { fieldClass } from "@/components/page-shell";
import { VisitedToggle } from "@/components/visited-toggle";
import { coordsOfPlace } from "@/lib/geocode";
import type { Place, TripDay } from "@/lib/types";

const filters = ["All", "Pending", "Unvisited", "Visited"] as const;
const types = ["All types", "Sight", "Food", "Shop", "Cafe", "Other"] as const;

export function PlacesList({
  places,
  days,
}: {
  places: Place[];
  days: TripDay[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof filters)[number]>("All");
  const [type, setType] = useState<(typeof types)[number]>("All types");
  const dayById = useMemo(() => new Map(days.map((day) => [day.id, day])), [days]);

  const filtered = useMemo(() => {
    return places.filter((place) => {
      if (status === "Pending" && !place.pending) return false;
      if (status === "Visited" && !place.visited) return false;
      if (status === "Unvisited" && (place.visited || place.pending)) return false;
      if (type !== "All types" && place.type !== type) return false;
      if (query.trim()) {
        const haystack = `${place.name} ${place.notes}`.toLowerCase();
        if (!haystack.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [places, query, status, type]);

  if (places.length === 0) {
    return (
      <EmptyState title="No places yet">
        Tap Add place above, or add entries in the Places database in Notion.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search places…"
          className={fieldClass}
        />
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as (typeof filters)[number])
          }
          className={fieldClass}
        >
          {filters.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(event) =>
            setType(event.target.value as (typeof types)[number])
          }
          className={fieldClass}
        >
          {types.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matches">Try another filter.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((place) => (
            <li
              key={place.id}
              className={`notebook-card min-w-0 p-4 ${
                place.pending ? "border-[#ea580c]/40 bg-[#ea580c]/5" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-stone-500">{place.type}</p>
                    {place.pending ? (
                      <span className="rounded-full bg-[#ea580c]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#ea580c]">
                        Maybe
                      </span>
                    ) : null}
                  </div>
                  <p className="flex items-start gap-1">
                    <span className="text-lg font-medium break-words">
                      {place.name}
                    </span>
                    <MapsPinLink
                      name={place.name}
                      lat={coordsOfPlace(place)?.lat}
                      lng={coordsOfPlace(place)?.lng}
                      mapsUrl={place.mapsUrl}
                      tone={
                        place.type === "Food" || place.type === "Cafe"
                          ? "food"
                          : "sight"
                      }
                    />
                  </p>
                  <p className="text-sm text-stone-500">
                    {place.dayIds.length > 0 ? (
                      place.dayIds.map((id, index) => {
                        const day = dayById.get(id);
                        if (!day) return null;
                        return (
                          <span key={id}>
                            {index > 0 ? ", " : null}
                            <Link
                              href={`/days/${id}`}
                              className="text-hanko underline"
                            >
                              {day.name}
                            </Link>
                          </span>
                        );
                      })
                    ) : (
                      "Unscheduled"
                    )}
                  </p>
                </div>
                <VisitedToggle id={place.id} visited={place.visited} />
              </div>
              <NotesForm id={place.id} notes={place.notes} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
