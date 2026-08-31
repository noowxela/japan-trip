type FlightLoadingProps = {
  message?: string;
  className?: string;
};

export function FlightLoading({
  message = "Syncing trip data…",
  className = "",
}: FlightLoadingProps) {
  return (
    <div
      className={`flex min-h-[50vh] flex-col items-center justify-center gap-4 ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flight-loading-plane">
        <FlightIcon />
      </div>
      <div className="flight-loading-dash" aria-hidden="true" />
      <p className="rounded-full bg-white px-5 py-2 text-sm text-stone-600 shadow-sm">
        {message}
      </p>
    </div>
  );
}

function FlightIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-16 w-16"
      aria-hidden="true"
    >
      <path
        d="M32 6C32 6 34 18 34 24L36 28H48L40 32L42 44L32 38L22 44L24 32L16 28H28L30 24C30 18 32 6 32 6Z"
        fill="#14b8a6"
      />
      <path
        d="M32 10C32 10 33.5 20 33.5 24L35 27H44L38 30L39.5 40L32 35.5L24.5 40L26 30L20 27H29L30.5 24C30.5 20 32 10 32 10Z"
        fill="#0f766e"
        opacity="0.25"
      />
      <ellipse cx="32" cy="30" rx="2.5" ry="5" fill="#0d9488" />
    </svg>
  );
}
