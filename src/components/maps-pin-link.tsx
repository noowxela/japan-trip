"use client";

import { useT } from "@/components/i18n-provider";
import { googleMapsHref } from "@/lib/maps";

export function MapsPinLink({
  name,
  lat,
  lng,
  mapsUrl,
  variant = "icon",
}: {
  name: string;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
  tone?: "sight" | "food";
  variant?: "icon" | "text";
}) {
  const { t } = useT();
  const href = googleMapsHref({ name, lat, lng, mapsUrl });
  const aria = t("map.openAria", { name });
  const title = t("map.openTitle");

  if (variant === "text") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={aria}
        title={title}
        className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs font-medium text-ink-muted no-underline hover:bg-canvas"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
        </svg>
        <span>{t("schedule.map")}</span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={aria}
      title={title}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-canvas"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
      </svg>
    </a>
  );
}
