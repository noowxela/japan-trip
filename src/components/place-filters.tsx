"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Place } from "@/lib/types";

const filters = ["All", "Pending", "Unvisited", "Visited"] as const;
const types = ["All types", "Sight", "Food", "Shop", "Cafe", "Other"] as const;

export function PlaceFilters({
  places,
  children,
}: {
  places: Place[];
  children: (filtered: Place[]) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof filters)[number]>("All");
  const [type, setType] = useState<(typeof types)[number]>("All types");

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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search places…"
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        />
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as (typeof filters)[number])
          }
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#b42318]"
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
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#b42318]"
        >
          {types.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      {children(filtered)}
    </div>
  );
}
