import { googleMapsHref } from "@/lib/maps";

export function MapsPinLink({
  name,
  lat,
  lng,
  mapsUrl,
  tone = "sight",
}: {
  name: string;
  lat?: number | null;
  lng?: number | null;
  mapsUrl?: string | null;
  tone?: "sight" | "food";
}) {
  const color =
    tone === "food"
      ? "text-[#ea580c] hover:bg-[#ea580c]/10"
      : "text-hanko hover:bg-hanko/10";
  return (
    <a
      href={googleMapsHref({ name, lat, lng, mapsUrl })}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${name} in Google Maps`}
      title="Open in Google Maps"
      className={`mt-0.5 inline-flex shrink-0 rounded-full p-1 ${color}`}
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
