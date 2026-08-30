"use client";

import { useState, useTransition } from "react";
import {
  confirmPendingPlace,
  parkPlaceAsPending,
} from "@/app/actions";
import { MapsPinLink } from "@/components/maps-pin-link";
import { VisitedToggle } from "@/components/visited-toggle";
import { formatTime, startBefore } from "@/lib/format";
import type { AgendaItem, Place } from "@/lib/types";

type DragPayload = { id: string; from: "pending" | "agenda" };

function readPayload(event: React.DragEvent) {
  try {
    return JSON.parse(event.dataTransfer.getData("text/plain")) as DragPayload;
  } catch {
    return null;
  }
}

function isFoodChip(chip: string | null) {
  return chip === "Food" || chip === "Cafe";
}

export function PendingPanel({
  pending,
  dayId,
}: {
  pending: Place[];
  dayId: string;
}) {
  const [busy, startTransition] = useTransition();
  const [over, setOver] = useState(false);

  function dropOnPending(event: React.DragEvent) {
    event.preventDefault();
    setOver(false);
    const payload = readPayload(event);
    if (!payload || payload.from !== "agenda") return;
    const formData = new FormData();
    formData.set("id", payload.id);
    formData.set("dayId", dayId);
    startTransition(() => parkPlaceAsPending(formData));
  }

  function addPending(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("dayId", dayId);
    startTransition(() => confirmPendingPlace(formData));
  }

  return (
    <aside
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={dropOnPending}
      className={`rounded-2xl border bg-white p-3 lg:sticky lg:top-20 ${
        over ? "border-[#ea580c]" : "border-stone-200"
      } ${busy ? "opacity-70" : ""}`}
    >
      <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
        Pending
      </p>
      <p className="mt-1 text-xs text-stone-500">
        Not sure yet. Drag onto the agenda if you go.
      </p>
      {pending.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-stone-200 px-3 py-6 text-center text-xs text-stone-400">
          Empty. Drag an agenda stop here to park it.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {pending.map((place) => (
            <li
              key={place.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  "text/plain",
                  JSON.stringify({ id: place.id, from: "pending" }),
                );
                event.dataTransfer.effectAllowed = "move";
              }}
              className="cursor-grab rounded-xl border border-[#ea580c]/30 bg-[#ea580c]/5 p-2.5 active:cursor-grabbing"
            >
              <p className="text-[10px] uppercase tracking-wide text-[#ea580c]">
                {place.type ?? "Maybe"}
              </p>
              <p className="text-sm font-medium leading-snug break-words">{place.name}</p>
              <button
                type="button"
                onClick={() => addPending(place.id)}
                className="mt-1.5 text-[11px] font-medium text-[#b42318]"
              >
                Add to agenda
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export function DayAgendaBoard({
  agenda,
  pending,
  dayId,
  dayDate,
}: {
  agenda: AgendaItem[];
  pending: Place[];
  dayId: string;
  dayDate: string | null;
}) {
  const [busy, startTransition] = useTransition();
  const [over, setOver] = useState<string | null>(null);

  function dropOnAgenda(before: AgendaItem | null) {
    return (event: React.DragEvent) => {
      event.preventDefault();
      setOver(null);
      const payload = readPayload(event);
      if (!payload || payload.from !== "pending") return;
      const formData = new FormData();
      formData.set("id", payload.id);
      formData.set("dayId", dayId);
      if (before?.start) {
        formData.set("start", startBefore(before.start, dayDate));
      }
      startTransition(() => confirmPendingPlace(formData));
    };
  }

  return (
    <div
      className={`grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start ${
        busy ? "opacity-70" : ""
      }`}
    >
      <div>
        {agenda.length === 0 ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setOver("agenda-empty");
            }}
            onDragLeave={() => setOver(null)}
            onDrop={dropOnAgenda(null)}
            className={`rounded-2xl border border-dashed px-4 py-8 text-sm ${
              over === "agenda-empty"
                ? "border-[#b42318] bg-[#b42318]/5 text-[#b42318]"
                : "border-stone-200 text-stone-500"
            }`}
          >
            Drag a maybe-spot here to put it on the agenda.
          </div>
        ) : (
          <ol className="relative space-y-0 border-l-2 border-stone-200 pl-5">
            {agenda.map((item) => {
              const food = item.kind === "place" && isFoodChip(item.chip);
              const dropId = `before-${item.id}`;
              return (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="relative pb-5 last:pb-0"
                  onDragOver={(event) => {
                    event.preventDefault();
                    setOver(dropId);
                  }}
                  onDragLeave={() => setOver(null)}
                  onDrop={dropOnAgenda(item)}
                >
                  {over === dropId ? (
                    <p className="mb-2 rounded-full bg-[#b42318] px-3 py-1 text-center text-[11px] font-medium text-white">
                      Drop to add before this
                    </p>
                  ) : null}
                  <span
                    className={`absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full ${
                      food ? "bg-[#ea580c]" : "bg-[#b42318]"
                    }`}
                  />
                  <div
                    draggable={item.kind === "place"}
                    onDragStart={(event) => {
                      if (item.kind !== "place") return;
                      event.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({ id: item.id, from: "agenda" }),
                      );
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    className="rounded-2xl border border-stone-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-stone-500">
                          {[formatTime(item.start) ?? "Anytime", item.chip]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="flex items-start gap-1">
                          <span className="text-lg font-medium break-words">
                            {item.name}
                          </span>
                          {item.kind === "place" ? (
                            <MapsPinLink
                              name={item.name}
                              lat={item.lat}
                              lng={item.lng}
                              mapsUrl={item.mapsUrl}
                              tone={food ? "food" : "sight"}
                            />
                          ) : null}
                        </p>
                        {item.detail ? (
                          <p className="text-sm text-stone-600">{item.detail}</p>
                        ) : null}
                      </div>
                      {item.kind === "place" ? (
                        <VisitedToggle
                          id={item.id}
                          visited={Boolean(item.visited)}
                        />
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
            <li
              onDragOver={(event) => {
                event.preventDefault();
                setOver("agenda-end");
              }}
              onDragLeave={() => setOver(null)}
              onDrop={dropOnAgenda(null)}
              className={`h-8 rounded-full border border-dashed ${
                over === "agenda-end"
                  ? "border-[#b42318] bg-[#b42318]/10"
                  : "border-transparent"
              }`}
            />
          </ol>
        )}
      </div>
      <PendingPanel pending={pending} dayId={dayId} />
    </div>
  );
}
