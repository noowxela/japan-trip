"use client";

import nextDynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { addStay, searchPlaces } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { DatePicker } from "@/components/date-picker";
import { useT } from "@/components/i18n-provider";
import { useListAddSheetClose } from "@/components/list-add-sheet";
import { btnPrimaryClass, fieldClass, formShellClass } from "@/components/page-shell";
import { tokyoToday } from "@/lib/format";
import { isGoogleMapsUrl } from "@/lib/maps-url";

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

export function AddStayForm({
  embedded = false,
  onSuccess,
}: {
  embedded?: boolean;
  onSuccess?: () => void;
} = {}) {
  const { t } = useT();
  const sheetClose = useListAddSheetClose();
  const [checkIn, setCheckIn] = useState(tokyoToday());
  const [checkOut, setCheckOut] = useState(tokyoToday());
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapsError, setMapsError] = useState("");
  const [mapsPending, startMaps] = useTransition();

  function applyMapsHit(
    hit: { name: string; displayName: string; lat: number; lng: number; mapsUrl: string },
    opts?: { keepName?: boolean },
  ) {
    setLat(hit.lat);
    setLng(hit.lng);
    setMapsUrl(hit.mapsUrl || mapsUrl);
    if (!opts?.keepName || !name.trim()) setName(hit.name);
    if (!address.trim() && hit.displayName && hit.displayName !== hit.mapsUrl) {
      setAddress(hit.displayName);
    }
    setMapsError("");
  }

  function resolveMapsField(raw: string) {
    const value = raw.trim();
    if (!isGoogleMapsUrl(value)) return;
    setMapsError("");
    startMaps(async () => {
      const hits = await searchPlaces(value);
      if (hits[0]) applyMapsHit(hits[0], { keepName: true });
      else setMapsError(t("form.mapsLinkFailed"));
    });
  }

  return (
    <ActionForm
      action={addStay}
      onSuccess={() => {
        onSuccess?.();
        sheetClose?.();
      }}
      className={`${embedded ? "grid gap-2" : `${formShellClass} grid gap-2`}`.trim()}
    >
      {!embedded ? (
        <p className="text-[14px] font-medium text-ink">{t("form.addStay")}</p>
      ) : null}
      <input type="hidden" name="lat" value={lat ?? ""} />
      <input type="hidden" name="lng" value={lng ?? ""} />
      <label className="grid gap-1">
        <span className="text-[12px] font-medium text-ink-muted">{t("form.name")}</span>
        <input
          name="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("form.hotelName")}
          className={fieldClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <DatePicker
          name="checkIn"
          value={checkIn}
          onChange={setCheckIn}
          label={t("form.checkIn")}
        />
        <DatePicker
          name="checkOut"
          value={checkOut}
          onChange={setCheckOut}
          label={t("form.checkOut")}
        />
      </div>
      <label className="grid gap-1">
        <span className="text-[12px] font-medium text-ink-muted">{t("form.address")}</span>
        <input
          name="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text").trim();
            if (!isGoogleMapsUrl(pasted)) return;
            event.preventDefault();
            setMapsUrl(pasted);
            resolveMapsField(pasted);
          }}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-[12px] font-medium text-ink-muted">
          {t("form.mapsUrl")}
        </span>
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
          className={fieldClass}
        />
      </label>
      {mapsError ? <p className="text-xs text-ink-muted">{mapsError}</p> : null}
      {mapsPending ? (
        <p className="text-xs text-ink-muted">…</p>
      ) : lat != null && lng != null ? (
        <PlacePreviewMap lat={lat} lng={lng} />
      ) : null}
      <label className="grid gap-1">
        <span className="text-[12px] font-medium text-ink-muted">
          {t("form.bookingUrl")}
        </span>
        <input name="bookingUrl" type="url" className={fieldClass} />
      </label>
      <label className="grid gap-1">
        <span className="text-[12px] font-medium text-ink-muted">
          {t("form.confirmation")}
        </span>
        <input name="confirmation" className={fieldClass} />
      </label>
      <button type="submit" className={btnPrimaryClass}>
        {t("form.addStay")}
      </button>
    </ActionForm>
  );
}
