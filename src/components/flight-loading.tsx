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
      className={`flex min-h-[50vh] flex-col items-center justify-center gap-5 ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flight-loading-scene">
        <div className="flight-loading-plane">
          <FlightIcon />
        </div>
        <div className="flight-loading-shadow" aria-hidden="true" />
      </div>
      <p className="rounded-full bg-white px-5 py-2 text-sm text-stone-600 shadow-sm">
        {message}
      </p>
    </div>
  );
}

function FlightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg"
      width="24" height="24" viewBox="0 0 24 24"
      fill="none">
      <g transform="translate(-5.640449 -2.617978) scale(0.224719)">
        <path d="M61 25
          L60 29 L67 55 L51 56
          L42 46 L34 46 L38 62 L34 84
          L43 84 L51 74 L65 74 L67 78
          L60 104 L72 105 L78 97 L90 75
          L117 73 Q123 69 123 63 Q121 59 112 56
          L91 56 L88 53 L74 27 Q72 25 61 25 Z"
          fill="#3DA99E"
          stroke="#3DA99E"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"/>
      </g>
    </svg>

  );
}
