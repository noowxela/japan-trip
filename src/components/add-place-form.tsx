"use client";

import nextDynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { addPlace, searchPlaces } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { ChipGroup } from "@/components/chip-group";
import { DatePicker } from "@/components/date-picker";
import { useT } from "@/components/i18n-provider";
import { useListAddSheetClose } from "@/components/list-add-sheet";
import { btnPrimaryClass, fieldClass, formShellClass } from "@/components/page-shell";
import { dateKey, tokyoToday, tokyoWallDateTime } from "@/lib/format";
import { labelType } from "@/lib/i18n/dictionaries";
import { PLACE_TYPES, type TripDay } from "@/lib/types";
import type { PlaceSearchHit } from "@/lib/geocode";

const PlacePreviewMap = nextDynamic(
  () => import("@/components/place-preview-map").then((mod) => mod.PlacePreviewMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-xl border border-line text-xs text-ink-muted">
        …
      </div>
    ),
  },
);

function guessType(hit: PlaceSearchHit): (typeof PLACE_TYPES)[number] | null {
  const hay = `${hit.name} ${hit.displayName}`.toLowerCase();
  if (/restaurant|ramen|sushi|food|食堂|料理|ラーメン|寿司|カフェ|cafe|coffee/.test(hay)) {
    return hay.includes("cafe") || hay.includes("coffee") || hay.includes("カフェ")
      ? "Cafe"
      : "Food";
  }
  if (/shop|store|market|mall|购物|商店|市场/.test(hay)) return "Shop";
  if (/temple|shrine|museum|park|tower|sight|寺|神社|公园|塔/.test(hay)) {
    return "Sight";
  }
  return null;
}

export function AddPlaceForm({
  days,
  defaultDayId,
  compact = false,
  embedded = false,
  onSuccess,
}: {
  days: TripDay[];
  defaultDayId?: string;
  compact?: boolean;
  embedded?: boolean;
  onSuccess?: () => void;
}) {
  const { t, locale } = useT();
  const sheetClose = useListAddSheetClose();
  const [query, setQuery] = useState("");
  const [dayId, setDayId] = useState(defaultDayId ?? "");
  const [results, setResults] = useState<PlaceSearchHit[]>([]);
  const [picked, setPicked] = useState<PlaceSearchHit | null>(null);
  const [name, setName] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [type, setType] = useState<(typeof PLACE_TYPES)[number]>("Sight");
  const [startDate, setStartDate] = useState(tokyoToday());
  const [startTime, setStartTime] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startSearch] = useTransition();

  const city = useMemo(
    () => days.find((day) => day.id === dayId)?.city ?? undefined,
    [days, dayId],
  );
  const tripDates = useMemo(() => {
    const set = new Set<string>();
    for (const day of days) {
      const key = dateKey(day.date);
      if (key) set.add(key);
    }
    return set;
  }, [days]);

  function onSearch() {
    setError("");
    startSearch(async () => {
      const hits = await searchPlaces(query, city);
      setResults(hits);
      if (hits.length === 0) setError(t("form.noMapResults"));
    });
  }

  function pick(hit: PlaceSearchHit) {
    setPicked(hit);
    setName(hit.name);
    setMapsUrl(hit.mapsUrl);
    const guessed = guessType(hit);
    if (guessed) setType(guessed);
    setResults([]);
  }

  const shellClass = embedded
    ? "grid gap-3"
    : compact
      ? "grid w-full gap-3 notebook-card p-4"
      : `${formShellClass} grid gap-3 notebook-card p-4`;

  const startValue =
    startDate && startTime
      ? tokyoWallDateTime(startDate, startTime)
      : startDate
        ? startDate
        : "";

  return (
    <div className={shellClass}>
      {!embedded ? <p className="font-medium text-ink">{t("form.addPlace")}</p> : null}
      <div className="grid gap-1">
        <span className="text-[12px] font-medium text-ink-muted">
          {t("form.searchPlaces")}
        </span>
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
            placeholder={t("form.searchMapHint")}
            className={`min-w-0 flex-1 ${fieldClass}`}
          />
          <button
            type="button"
            onClick={onSearch}
            disabled={pending || query.trim().length < 2}
            className="notebook-btn shrink-0 bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "…" : t("form.search")}
          </button>
        </div>
      </div>
      {error ? <p className="text-xs text-ink-muted">{error}</p> : null}
      {results.length > 0 ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {results.map((hit) => (
            <li key={`${hit.lat}-${hit.lng}-${hit.displayName}`}>
              <button
                type="button"
                onClick={() => pick(hit)}
                className="w-full px-3 py-2 text-left hover:bg-canvas"
              >
                <p className="text-sm font-medium">{hit.name}</p>
                <p className="text-xs text-ink-muted">{hit.displayName}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {picked ? (
        <div className="space-y-2">
          <PlacePreviewMap lat={picked.lat} lng={picked.lng} />
          <p className="text-xs text-ink-muted">{picked.displayName}</p>
        </div>
      ) : null}

      <ActionForm
        action={addPlace}
        onSuccess={() => {
          onSuccess?.();
          sheetClose?.();
        }}
        className="grid gap-2"
      >
        <input type="hidden" name="lat" value={picked?.lat ?? ""} />
        <input type="hidden" name="lng" value={picked?.lng ?? ""} />
        <input type="hidden" name="start" value={startValue} />
        <label className="grid gap-1">
          <span className="text-[12px] font-medium text-ink-muted">{t("form.name")}</span>
          <input
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("form.placeName")}
            className={fieldClass}
          />
        </label>
        <ChipGroup
          name="type"
          label={t("form.type")}
          value={type}
          onChange={setType}
          options={PLACE_TYPES.map((value) => ({
            value,
            label: labelType(locale, value) ?? value,
          }))}
        />
        {days.length > 0 ? (
          <ChipGroup
            name="dayId"
            label={t("form.day")}
            value={dayId || days[0].id}
            onChange={(id) => {
              setDayId(id);
              const matched = days.find((day) => day.id === id);
              const key = dateKey(matched?.date ?? null);
              if (key) setStartDate(key);
            }}
            options={days.map((day) => ({ value: day.id, label: day.name }))}
          />
        ) : (
          <input type="hidden" name="dayId" value="" />
        )}
        <div className="grid gap-1.5">
          <span className="text-[12px] font-medium text-ink-muted">{t("form.start")}</span>
          <div className="flex flex-wrap gap-2">
            <DatePicker
              name="startDate"
              value={startDate}
              onChange={setStartDate}
              tripDates={tripDates}
              label={null}
              compact
            />
            <label className="notebook-btn inline-flex min-h-11 items-center border border-line bg-surface px-3 text-sm">
              <span className="sr-only">{t("form.time")}</span>
              <input
                type="time"
                step={60}
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="border-0 bg-transparent outline-none tabular-nums"
              />
            </label>
          </div>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="pending" value="true" className="rounded" />
          {t("form.maybePending")}
        </label>
        <label className="grid gap-1">
          <span className="text-[12px] font-medium text-ink-muted">{t("form.notes")}</span>
          <textarea name="notes" rows={2} className={fieldClass} />
        </label>

        <div className="rounded-xl border border-line">
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((value) => !value)}
            className="flex min-h-11 w-full items-center justify-between px-3 text-sm font-medium text-ink-muted"
          >
            {t("common.more")}
            <span aria-hidden>{moreOpen ? "▴" : "▾"}</span>
          </button>
          {moreOpen ? (
            <div className="grid gap-2 border-t border-line p-3">
              <label className="grid gap-1">
                <span className="text-[12px] font-medium text-ink-muted">
                  {t("form.mapsUrl")}
                </span>
                <input
                  name="mapsUrl"
                  type="url"
                  value={mapsUrl}
                  onChange={(event) => setMapsUrl(event.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
          ) : (
            <input type="hidden" name="mapsUrl" value={mapsUrl} />
          )}
        </div>

        <button type="submit" className={btnPrimaryClass}>
          {t("form.addPlace")}
        </button>
      </ActionForm>
    </div>
  );
}
