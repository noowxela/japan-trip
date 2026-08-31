"use client";

import { useState, useTransition } from "react";
import {
  confirmPendingPlace,
  movePendingToDay,
  parkPlaceAsPending,
} from "@/app/actions";
import { useActionToast } from "@/components/action-form";
import { MapsPinLink } from "@/components/maps-pin-link";
import { VisitedToggle } from "@/components/visited-toggle";
import { formatTime, gapBetweenStarts, startBefore } from "@/lib/format";
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

function PendingCard({
  place,
  dayId,
  dayDate,
  onAddEnd,
  onMoveHere,
  showMoveHere,
}: {
  place: Place;
  dayId: string;
  dayDate: string | null;
  onAddEnd: () => void;
  onMoveHere?: () => void;
  showMoveHere?: boolean;
}) {
  const [busy, startTransition] = useTransition();
  const notify = useActionToast();

  function scheduleBefore(before: AgendaItem | null) {
    const formData = new FormData();
    formData.set("id", place.id);
    formData.set("dayId", dayId);
    if (before?.start) {
      formData.set("start", startBefore(before.start, dayDate));
    } else {
      formData.set("slot", "end");
    }
    startTransition(async () => notify(await confirmPendingPlace(formData)));
  }

  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(
          "text/plain",
          JSON.stringify({ id: place.id, from: "pending" }),
        );
        event.dataTransfer.effectAllowed = "move";
      }}
      className={`rounded-xl border border-[#ea580c]/30 bg-[#ea580c]/5 p-2.5 ${
        busy ? "opacity-70" : ""
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-[#ea580c]">
        {place.type ?? "Maybe"}
      </p>
      <p className="text-sm font-medium leading-snug break-words">{place.name}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddEnd}
          className="rounded-full bg-[#b42318] px-3 py-1 text-[11px] font-medium text-white"
        >
          Add to agenda
        </button>
        {showMoveHere && onMoveHere ? (
          <button
            type="button"
            onClick={onMoveHere}
            className="rounded-full bg-stone-200 px-3 py-1 text-[11px] font-medium text-stone-700"
          >
            Move here
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => scheduleBefore(null)}
          className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-700"
        >
          Schedule
        </button>
      </div>
    </li>
  );
}

export function PendingPanel({
  pending,
  dayId,
  dayDate,
  mobileSheet = false,
}: {
  pending: Place[];
  dayId: string;
  dayDate: string | null;
  mobileSheet?: boolean;
}) {
  const [busy, startTransition] = useTransition();
  const [over, setOver] = useState(false);
  const notify = useActionToast();

  function dropOnPending(event: React.DragEvent) {
    event.preventDefault();
    setOver(false);
    const payload = readPayload(event);
    if (!payload || payload.from !== "agenda") return;
    const formData = new FormData();
    formData.set("id", payload.id);
    formData.set("dayId", dayId);
    startTransition(async () => notify(await parkPlaceAsPending(formData)));
  }

  function addToAgenda(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("dayId", dayId);
    formData.set("slot", "end");
    startTransition(async () => notify(await confirmPendingPlace(formData)));
  }

  const shellClass = mobileSheet
    ? "rounded-t-3xl border border-stone-200 bg-white p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] lg:hidden"
    : "hidden rounded-2xl border bg-white p-3 lg:sticky lg:top-20 lg:block";

  return (
    <aside
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={dropOnPending}
      className={`${shellClass} ${over ? "border-[#ea580c]" : "border-stone-200"} ${
        busy ? "opacity-70" : ""
      }`}
    >
      <p className="text-sm font-medium uppercase tracking-wide text-stone-500">
        Pending
      </p>
      <p className="mt-1 text-xs text-stone-500">
        Maybe spots. Tap to add, or drag on desktop.
      </p>
      {pending.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-stone-200 px-3 py-6 text-center text-xs text-stone-400">
          Empty. Park an agenda stop here if plans change.
        </p>
      ) : (
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto lg:max-h-none">
          {pending.map((place) => (
            <PendingCard
              key={place.id}
              place={place}
              dayId={dayId}
              dayDate={dayDate}
              onAddEnd={() => addToAgenda(place.id)}
            />
          ))}
        </ul>
      )}
    </aside>
  );
}

export function CarryOverBanner({
  places,
  dayId,
  title,
}: {
  places: Place[];
  dayId: string;
  title: string;
}) {
  const [busy, startTransition] = useTransition();
  const notify = useActionToast();

  if (places.length === 0) return null;

  function moveHere(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("dayId", dayId);
    startTransition(async () => notify(await movePendingToDay(formData)));
  }

  function addToAgenda(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("dayId", dayId);
    formData.set("slot", "end");
    startTransition(async () => notify(await confirmPendingPlace(formData)));
  }

  return (
    <section
      className={`rounded-2xl border border-[#ea580c]/30 bg-[#ea580c]/5 p-4 ${
        busy ? "opacity-70" : ""
      }`}
    >
      <p className="text-sm font-medium text-[#ea580c]">{title}</p>
      <ul className="mt-3 space-y-2">
        {places.map((place) => (
          <li
            key={place.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium break-words">{place.name}</p>
              <p className="text-xs text-stone-500">{place.type ?? "Place"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {place.pending ? (
                <button
                  type="button"
                  onClick={() => addToAgenda(place.id)}
                  className="rounded-full bg-[#b42318] px-3 py-1 text-xs font-medium text-white"
                >
                  Add today
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => moveHere(place.id)}
                  className="rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white"
                >
                  Move here
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
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
  const notify = useActionToast();
  const visitedCount = agenda.filter(
    (item) => item.kind === "place" && item.visited,
  ).length;

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
      } else {
        formData.set("slot", "end");
      }
      startTransition(async () => notify(await confirmPendingPlace(formData)));
    };
  }

  function parkPlace(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("dayId", dayId);
    startTransition(async () => notify(await parkPlaceAsPending(formData)));
  }

  return (
    <div className={`grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start ${busy ? "opacity-70" : ""}`}>
      <div>
        {visitedCount > 0 ? (
          <p className="mb-3 text-xs text-stone-500">
            Done ({visitedCount}) · tap to expand visited stops below
          </p>
        ) : null}
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
            No stops yet. Add from pending below or use quick add.
          </div>
        ) : (
          <ol className="relative space-y-0 border-l-2 border-stone-200 pl-5">
            {agenda.map((item, index) => {
              const food = item.kind === "place" && isFoodChip(item.chip);
              const visited = item.kind === "place" && item.visited;
              const dropId = `before-${item.id}`;
              const previous = index > 0 ? agenda[index - 1] : null;
              const gap =
                previous && item.start
                  ? gapBetweenStarts(previous.start, item.start)
                  : null;
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
                  {gap ? (
                    <p className="mb-2 ml-1 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                      {gap}
                    </p>
                  ) : null}
                  {over === dropId ? (
                    <p className="mb-2 rounded-full bg-[#b42318] px-3 py-1 text-center text-[11px] font-medium text-white">
                      Drop to add before this
                    </p>
                  ) : null}
                  <span
                    className={`absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full ${
                      visited
                        ? "bg-emerald-500"
                        : food
                          ? "bg-[#ea580c]"
                          : "bg-[#b42318]"
                    }`}
                  />
                  <div
                    draggable={item.kind === "place" && !visited}
                    onDragStart={(event) => {
                      if (item.kind !== "place" || visited) return;
                      event.dataTransfer.setData(
                        "text/plain",
                        JSON.stringify({ id: item.id, from: "agenda" }),
                      );
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    className={`rounded-2xl border bg-white p-4 ${
                      visited
                        ? "border-emerald-100 bg-emerald-50/40 opacity-70"
                        : "border-stone-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-stone-500">
                          {[formatTime(item.start) ?? "Anytime", item.chip]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="flex items-start gap-1">
                          <span
                            className={`text-lg font-medium break-words ${
                              visited ? "line-through text-stone-500" : ""
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.kind === "place" && !visited ? (
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
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {item.kind === "place" ? (
                          <VisitedToggle
                            id={item.id}
                            visited={Boolean(item.visited)}
                          />
                        ) : null}
                        {item.kind === "place" && !visited ? (
                          <button
                            type="button"
                            onClick={() => parkPlace(item.id)}
                            className="text-[11px] font-medium text-[#ea580c]"
                          >
                            Park
                          </button>
                        ) : null}
                      </div>
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
      <PendingPanel
        pending={pending}
        dayId={dayId}
        dayDate={dayDate}
      />
      <PendingPanel
        pending={pending}
        dayId={dayId}
        dayDate={dayDate}
        mobileSheet
      />
    </div>
  );
}
