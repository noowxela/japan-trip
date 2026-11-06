/** Nose points up. Callers that follow a path rotate this so +X is forward. */
export const FLIGHT_PLANE_PATH =
  "M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z";

/** Tiny looping airplane shown beside the "Flight / 航班" label. */
export function FlightPlaneIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden
      focusable="false"
      className={`flight-plane-icon inline-block align-[-0.125em] ${className}`.trim()}
    >
      <path d={FLIGHT_PLANE_PATH} />
    </svg>
  );
}
