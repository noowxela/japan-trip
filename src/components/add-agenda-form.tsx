"use client";

import { useMemo, useState, useTransition } from "react";
import { addPlace, addTransit, searchPlaces } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { ChipGroup } from "@/components/chip-group";
import { useT } from "@/components/i18n-provider";
import { btnPrimaryClass, fieldClass } from "@/components/page-shell";
import { dateKey } from "@/lib/format";
import type { PlaceSearchHit } from "@/lib/geocode";
import { labelMode, labelType } from "@/lib/i18n/dictionaries";
import {
  PLACE_TYPES,
  TRANSIT_MODES,
  type TripDay,
} from "@/lib/types";

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
  const { t, locale } = useT();
  const [kind, setKind] = useState<Kind>("place");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchHit[]>([]);
  const [picked, setPicked] = useState<PlaceSearchHit | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof PLACE_TYPES)[number]>("Sight");
  const [mode, setMode] = useState<(typeof TRANSIT_MODES)[number]>("Metro");
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
        setError(t("form.noMapResults"));
      }
    });
  }

  function pick(hit: PlaceSearchHit) {
    setPicked(hit);
    setName(hit.name);
    setResults([]);
  }

  return (
    <ActionForm
      action={kind === "place" ? addPlace : addTransit}
      className="grid min-w-0 gap-3 notebook-card p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium text-ink">{t("fab.addAgenda")}</p>
        <ChipGroup
          value={kind}
          onChange={setKind}
          options={[
            { value: "place", label: t("form.kindPlace") },
            { value: "transit", label: t("form.kindTransit") },
          ]}
        />
      </div>

      <input type="hidden" name="dayId" value={defaultDayId} />
      <input type="hidden" name="dayDate" value={date} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="lat" value={picked?.lat ?? ""} />
      <input type="hidden" name="lng" value={picked?.lng ?? ""} />
      <input type="hidden" name="mapsUrl" value={picked?.mapsUrl ?? ""} />

      {kind === "place" ? (
        <>
          <div className="grid gap-1">
            <span className="text-xs font-medium text-ink-muted">
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
                placeholder={t("form.searchMap")}
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
        </>
      ) : null}

      <label className="grid gap-1">
        <span className="text-xs font-medium text-ink-muted">{t("form.name")}</span>
        <input
          name="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={
            kind === "place" ? t("form.placeName") : t("form.transitName")
          }
          className={fieldClass}
        />
      </label>

      {kind === "place" ? (
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
      ) : (
        <>
          <ChipGroup
            name="mode"
            label={t("form.mode")}
            value={mode}
            onChange={setMode}
            options={TRANSIT_MODES.map((value) => ({
              value,
              label: labelMode(locale, value) ?? value,
            }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-ink-muted">
                {t("form.from")}
              </span>
              <input name="from" className={fieldClass} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-ink-muted">
                {t("form.to")}
              </span>
              <input name="to" className={fieldClass} />
            </label>
          </div>
        </>
      )}

      <div className={kind === "transit" ? "grid grid-cols-2 gap-3" : ""}>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-ink-muted">{t("form.time")}</span>
          <input
            name="time"
            type="time"
            step="60"
            className={`${fieldClass} cursor-pointer`}
          />
        </label>
        {kind === "transit" ? (
          <label className="grid gap-1">
            <span className="text-xs font-medium text-ink-muted">
              {t("form.order")}
            </span>
            <input name="order" type="number" className={fieldClass} />
          </label>
        ) : null}
      </div>

      <button type="submit" className={btnPrimaryClass}>
        {kind === "place" ? t("form.addPlace") : t("form.addTransit")}
      </button>
    </ActionForm>
  );
}
