"use client";

import { useT } from "@/components/i18n-provider";
import { labelStatus } from "@/lib/i18n/dictionaries";

const tones: Record<string, string> = {
  Planned: "bg-canvas text-ink-muted",
  Confirmed: "bg-ok-soft text-ok",
  Done: "bg-ok-soft text-ok",
};

export function StatusBadge({ status }: { status: string | null }) {
  const { locale } = useT();
  if (!status) return null;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
        tones[status] ?? "bg-canvas text-ink-muted"
      }`}
    >
      {labelStatus(locale, status)}
    </span>
  );
}
