"use client";

import { useT } from "@/components/i18n-provider";
import { googleDirectionsHref } from "@/lib/maps";

export function DirectionsLink({
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
  variant?: "icon" | "text";
}) {
  const { t } = useT();
  const href = googleDirectionsHref({ name, lat, lng, mapsUrl });
  const aria = t("map.directionsAria", { name });
  const title = t("map.directionsTitle");

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
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 20 3 12l6-8M15 4l6 8-6 8M3 12h18"
          />
        </svg>
        <span>{t("schedule.route")}</span>
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
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-muted no-underline hover:bg-canvas"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 20 3 12l6-8M15 4l6 8-6 8M3 12h18"
        />
      </svg>
    </a>
  );
}
