"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Marker, useMap } from "react-leaflet";
import { useT } from "@/components/i18n-provider";
import { MAP_CORNER_BTN_SM } from "@/components/map-zoom-buttons";
import { userLocationIcon } from "@/lib/map-pin-icons";
import {
  accuracyRadiusMeters,
  geolocationErrorKind,
  isGeolocationAvailable,
  LOCATE_ME_ZOOM,
  USER_LOCATION_WATCH_OPTIONS,
  userLocationFromCoords,
  type UserLocationFix,
  type UserLocationStatus,
} from "@/lib/user-location";

const LOCATION_BLUE = "#1a73e8";

/** Watch the device location while mounted; clear the watch on unmount. */
export function useUserLocationWatch(): {
  fix: UserLocationFix | null;
  status: UserLocationStatus;
} {
  const [fix, setFix] = useState<UserLocationFix | null>(null);
  const [status, setStatus] = useState<UserLocationStatus>("pending");

  useEffect(() => {
    if (!isGeolocationAvailable()) {
      setStatus("unavailable");
      return;
    }

    let cancelled = false;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled) return;
        const next = userLocationFromCoords(position.coords);
        if (!next) return;
        setFix(next);
        setStatus("ready");
      },
      (error) => {
        if (cancelled) return;
        setStatus(geolocationErrorKind(error));
      },
      USER_LOCATION_WATCH_OPTIONS,
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return { fix, status };
}

/** Blue-dot + optional accuracy ring. Does not move the map camera. */
export function UserLocationMarker({ fix }: { fix: UserLocationFix | null }) {
  const iconRef = useRef(userLocationIcon());
  if (!fix) return null;

  const radius = accuracyRadiusMeters(fix.accuracy);

  return (
    <>
      {radius != null ? (
        <Circle
          center={[fix.lat, fix.lng]}
          radius={radius}
          pathOptions={{
            color: LOCATION_BLUE,
            weight: 1,
            opacity: 0.35,
            fillColor: LOCATION_BLUE,
            fillOpacity: 0.12,
          }}
          interactive={false}
        />
      ) : null}
      <Marker
        position={[fix.lat, fix.lng]}
        icon={iconRef.current}
        interactive={false}
        keyboard={false}
        zIndexOffset={800}
      />
    </>
  );
}

/** One-shot recenter on the current fix (no continuous follow). */
export function MapLocateMeButton({
  fix,
  status,
}: {
  fix: UserLocationFix | null;
  status: UserLocationStatus;
}) {
  const map = useMap();
  const { t } = useT();
  const denied = status === "denied";
  const unavailable = status === "unavailable";
  // Stay tappable while the first fix is pending so the control does not look dead
  // during the permission prompt; denied / unavailable stay disabled.
  const disabled = denied || unavailable;
  const label = denied
    ? t("map.locationDenied")
    : unavailable
      ? t("map.locationUnavailable")
      : t("map.locateMe");

  const onLocate = useCallback(() => {
    const fly = (next: { lat: number; lng: number }) => {
      map.flyTo([next.lat, next.lng], Math.max(map.getZoom(), LOCATE_ME_ZOOM), {
        duration: 0.55,
      });
    };
    if (fix) {
      fly(fix);
      return;
    }
    if (!isGeolocationAvailable()) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = userLocationFromCoords(position.coords);
        if (next) fly(next);
      },
      () => {
        /* watch handler owns denied / unavailable status */
      },
      USER_LOCATION_WATCH_OPTIONS,
    );
  }, [map, fix]);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onLocate}
      className={`${MAP_CORNER_BTN_SM} disabled:cursor-not-allowed disabled:opacity-45`}
    >
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    </button>
  );
}
