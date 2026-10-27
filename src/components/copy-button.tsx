"use client";

import { useState } from "react";
import { useToast } from "@/components/toast-provider";
import { useT } from "@/components/i18n-provider";

export function CopyButton({
  value,
  label,
  icon = false,
}: {
  value: string;
  label?: string;
  /** Compact icon-only control for dense rows. */
  icon?: boolean;
}) {
  const { toast } = useToast();
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const idle = label ?? t("copy.copy");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast(t("copy.clipboard"));
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast(t("copy.failed"), "error");
    }
  }

  if (icon) {
    return (
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? t("copy.copied") : idle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink"
      >
        {copied ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="notebook-btn bg-canvas px-3 py-1 text-xs font-medium text-ink"
    >
      {copied ? t("copy.copied") : idle}
    </button>
  );
}
