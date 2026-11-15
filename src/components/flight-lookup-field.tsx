"use client";

import { useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";
import { btnGhostClass, fieldClass } from "@/components/page-shell";
import {
  suggestedFlightName,
  type FlightLookupResult,
} from "@/lib/flight-lookup";

export type FlightLookupFill = {
  name: string;
  from: string;
  to: string;
  date: string | null;
  time: string | null;
  bookingUrl: string;
};

export function FlightLookupField({
  onFill,
}: {
  onFill: (fill: FlightLookupFill) => void;
}) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function lookup() {
    const q = query.trim();
    if (!q) return;
    setError(null);
    setHint(null);
    start(async () => {
      try {
        const res = await fetch(
          `/api/flight-lookup?q=${encodeURIComponent(q)}`,
          { cache: "no-store" },
        );
        if (res.status === 404) {
          setError(t("flight.lookupNotFound"));
          return;
        }
        if (!res.ok) {
          setError(t("flight.lookupFailed"));
          return;
        }
        const data = (await res.json()) as FlightLookupResult;
        onFill({
          name: suggestedFlightName(data),
          from: data.fromIata ?? "",
          to: data.toIata ?? "",
          date: data.date,
          time: data.time,
          bookingUrl: data.trackUrl,
        });
        const bits = [
          data.airline,
          data.fromIata && data.toIata
            ? `${data.fromIata}→${data.toIata}`
            : null,
          data.date,
          data.time,
          data.status,
        ].filter(Boolean);
        setHint(bits.join(" · ") || t("flight.lookupFilled"));
      } catch {
        setError(t("flight.lookupFailed"));
      }
    });
  }

  return (
    <div className="grid gap-1 rounded-xl border border-line/80 bg-surface px-3 py-2">
      <span className="text-xs font-medium text-ink-muted">
        {t("flight.lookupLabel")}
      </span>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              lookup();
            }
          }}
          placeholder={t("flight.lookupPlaceholder")}
          className={`${fieldClass} flex-1`}
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={lookup}
          disabled={pending || !query.trim()}
          className={`${btnGhostClass} shrink-0 disabled:opacity-50`}
        >
          {pending ? t("flight.lookupBusy") : t("flight.lookupAction")}
        </button>
      </div>
      {hint ? <p className="text-[11px] text-ok">{hint}</p> : null}
      {error ? <p className="text-[11px] text-accent">{error}</p> : null}
      <p className="text-[11px] text-ink-muted">{t("flight.lookupHint")}</p>
    </div>
  );
}
