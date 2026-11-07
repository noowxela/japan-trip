"use client";

import nextDynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { deleteStay, searchPlaces, updateStay } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import {
  ActionSheet,
  ActionSheetItem,
  CompactRow,
  compactFieldClass,
  compactLabelClass,
  RowMoreButton,
} from "@/components/compact";
import { CopyButton } from "@/components/copy-button";
import { useCanEdit } from "@/components/edit-session";
import { useT } from "@/components/i18n-provider";
import { MapsPinLink } from "@/components/maps-pin-link";
import { useTrashUndo } from "@/components/use-trash-undo";
import { btnGhostClass, btnPrimaryClass } from "@/components/page-shell";
import { formatTabDate, nightsBetween } from "@/lib/format";
import { coordsOfStay } from "@/lib/geocode";
import { isGoogleMapsUrl } from "@/lib/maps-url";
import type { Stay } from "@/lib/types";

const PlacePreviewMap = nextDynamic(
  () => import("@/components/place-preview-map").then((mod) => mod.PlacePreviewMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-40 items-center justify-center rounded-xl border border-line text-xs text-ink-muted">
        …
      </div>
    ),
  },
);

export function StayCard({ stay }: { stay: Stay }) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [mapsUrl, setMapsUrl] = useState(stay.mapsUrl ?? "");
  const [lat, setLat] = useState<number | null>(stay.lat ?? null);
  const [lng, setLng] = useState<number | null>(stay.lng ?? null);
  const [mapsError, setMapsError] = useState("");
  const [mapsPending, startMaps] = useTransition();
  const trashWithUndo = useTrashUndo();
  const canEdit = useCanEdit();
  const { t } = useT();
  const coords = coordsOfStay(stay);
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const inCompact = stay.checkIn ? formatTabDate(stay.checkIn) : "—";
  const outCompact = stay.checkOut ? formatTabDate(stay.checkOut) : null;

  function beginEdit() {
    setMapsUrl(stay.mapsUrl ?? "");
    setLat(stay.lat ?? null);
    setLng(stay.lng ?? null);
    setMapsError("");
    setEditing(true);
  }

  function resolveMapsField(raw: string) {
    const value = raw.trim();
    if (!isGoogleMapsUrl(value)) return;
    setMapsError("");
    startMaps(async () => {
      const hits = await searchPlaces(value);
      if (hits[0]) {
        setLat(hits[0].lat);
        setLng(hits[0].lng);
        setMapsUrl(hits[0].mapsUrl || value);
        setMapsError("");
      } else {
        setMapsError(t("form.mapsLinkFailed"));
      }
    });
  }

  if (editing) {
    return (
      <ActionForm
        action={updateStay}
        className="grid gap-2 rounded-xl border border-line bg-surface p-3"
        onSuccess={() => setEditing(false)}
      >
        <input type="hidden" name="id" value={stay.id} />
        <input type="hidden" name="lat" value={lat ?? ""} />
        <input type="hidden" name="lng" value={lng ?? ""} />
        <label className={`block ${compactLabelClass}`}>
          {t("form.name")}
          <input
            name="name"
            required
            defaultValue={stay.name}
            className={`mt-1 ${compactFieldClass}`}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={`block ${compactLabelClass}`}>
            {t("form.checkIn")}
            <input
              name="checkIn"
              type="date"
              defaultValue={stay.checkIn?.slice(0, 10) ?? ""}
              className={`mt-1 ${compactFieldClass}`}
            />
          </label>
          <label className={`block ${compactLabelClass}`}>
            {t("form.checkOut")}
            <input
              name="checkOut"
              type="date"
              defaultValue={stay.checkOut?.slice(0, 10) ?? ""}
              className={`mt-1 ${compactFieldClass}`}
            />
          </label>
        </div>
        <label className={`block ${compactLabelClass}`}>
          {t("form.address")}
          <input
            name="address"
            defaultValue={stay.address}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData("text").trim();
              if (!isGoogleMapsUrl(pasted)) return;
              event.preventDefault();
              setMapsUrl(pasted);
              resolveMapsField(pasted);
            }}
            className={`mt-1 ${compactFieldClass}`}
          />
        </label>
        <label className={`block ${compactLabelClass}`}>
          {t("form.mapsUrl")}
          <input
            name="mapsUrl"
            type="url"
            value={mapsUrl}
            onChange={(event) => setMapsUrl(event.target.value)}
            onBlur={(event) => resolveMapsField(event.target.value)}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData("text").trim();
              if (!isGoogleMapsUrl(pasted)) return;
              setMapsUrl(pasted);
              resolveMapsField(pasted);
            }}
            placeholder={t("form.mapsUrlHint")}
            className={`mt-1 ${compactFieldClass}`}
          />
        </label>
        {mapsError ? <p className="text-xs text-ink-muted">{mapsError}</p> : null}
        {mapsPending ? (
          <p className="text-xs text-ink-muted">…</p>
        ) : lat != null && lng != null ? (
          <PlacePreviewMap lat={lat} lng={lng} />
        ) : null}
        <label className={`block ${compactLabelClass}`}>
          {t("form.bookingUrl")}
          <input
            name="bookingUrl"
            type="url"
            defaultValue={stay.bookingUrl ?? ""}
            className={`mt-1 ${compactFieldClass}`}
          />
        </label>
        <label className={`block ${compactLabelClass}`}>
          {t("form.confirmation")}
          <input
            name="confirmation"
            defaultValue={stay.confirmation}
            className={`mt-1 ${compactFieldClass}`}
          />
        </label>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" className={btnPrimaryClass}>
            {t("common.save")}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={btnGhostClass}
          >
            {t("common.cancel")}
          </button>
        </div>
      </ActionForm>
    );
  }

  const metaBits = [
    stay.address || null,
    stay.confirmation
      ? t("stay.conf", { code: stay.confirmation })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <CompactRow
        leading={
          nights != null ? (
            <span className="flex flex-col items-end gap-0 text-[12px] font-medium leading-4 text-ink-muted tabular-nums">
              <span>{inCompact}</span>
              <span>{t("stay.nights", { n: nights })}</span>
            </span>
          ) : outCompact ? (
            <span className="text-[12px] font-medium leading-4 text-ink-muted tabular-nums">
              {inCompact}–{outCompact.replace(/^\d+\//, "")}
            </span>
          ) : (
            <span className="text-[12px] font-medium leading-4 text-ink-muted tabular-nums">
              {inCompact}
            </span>
          )
        }
        title={stay.name}
        secondary={metaBits || undefined}
        trailing={
          <>
            {stay.confirmation ? (
              <CopyButton value={stay.confirmation} icon />
            ) : null}
            <RowMoreButton
              label={t("agenda.actionsFor", { name: stay.name })}
              onClick={() => setMenuOpen(true)}
            />
          </>
        }
      />
      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={stay.name}
      >
        {canEdit ? (
          <ActionSheetItem
            onClick={() => {
              setMenuOpen(false);
              beginEdit();
            }}
          >
            {t("common.edit")}
          </ActionSheetItem>
        ) : null}
        {coords || stay.address || stay.mapsUrl ? (
          <div className="px-1">
            <MapsPinLink
              name={stay.address || stay.name}
              lat={coords?.lat}
              lng={coords?.lng}
              mapsUrl={stay.mapsUrl}
              variant="text"
            />
          </div>
        ) : null}
        {stay.bookingUrl ? (
          <a
            href={stay.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="notebook-btn inline-flex min-h-11 w-full items-center justify-start rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-medium text-ink no-underline"
            onClick={() => setMenuOpen(false)}
          >
            {t("transit.booking")}
          </a>
        ) : null}
        {canEdit ? (
          <ActionSheetItem
            danger
            disabled={busy}
            onClick={() => {
              const formData = new FormData();
              formData.set("id", stay.id);
              setMenuOpen(false);
              startTransition(async () => {
                await trashWithUndo(await deleteStay(formData), stay.id, "stay");
              });
            }}
          >
            {t("common.delete")}
          </ActionSheetItem>
        ) : null}
        <ActionSheetItem onClick={() => setMenuOpen(false)}>
          {t("common.cancel")}
        </ActionSheetItem>
      </ActionSheet>
    </>
  );
}
