"use client";

import { useSyncExternalStore } from "react";
import { compactFieldClass, compactLabelClass } from "@/components/compact";
import { useT } from "@/components/i18n-provider";
import {
  EMPTY_RECIPIENTS,
  readRecentRecipients,
  subscribeRecentRecipients,
} from "@/lib/gifts";

export type SpendGiftValue = {
  flagged: boolean;
  forSelf: boolean;
  recipient: string;
};

export function SpendGiftFields({
  value,
  onChange,
  compact = false,
}: {
  value: SpendGiftValue;
  onChange: (value: SpendGiftValue) => void;
  compact?: boolean;
}) {
  const { t } = useT();
  const recent = useSyncExternalStore(
    subscribeRecentRecipients,
    readRecentRecipients,
    () => EMPTY_RECIPIENTS,
  );

  return (
    <div className={compact ? "grid gap-1.5" : "grid gap-2"}>
      <label className="flex min-h-11 items-center gap-2 text-[13px] text-ink">
        <input
          type="checkbox"
          checked={value.flagged}
          onChange={(event) =>
            onChange({ ...value, flagged: event.target.checked })
          }
          className="h-4 w-4 accent-accent"
        />
        {t("gifts.thisIsGift")}
      </label>
      {value.flagged ? (
        <div className="grid gap-1.5">
          <span className={compactLabelClass}>{t("gifts.whoFor")}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={value.forSelf}
              onClick={() => onChange({ ...value, forSelf: true, recipient: "" })}
              className={`notebook-btn inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium ${
                value.forSelf
                  ? "bg-ink text-surface"
                  : "border border-line bg-surface text-ink"
              }`}
            >
              {t("gifts.myself")}
            </button>
            {recent.map((name) => {
              const selected =
                !value.forSelf &&
                name.toLowerCase() === value.recipient.trim().toLowerCase();
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    onChange({ ...value, forSelf: false, recipient: name })
                  }
                  className={`notebook-btn inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium ${
                    selected
                      ? "bg-ink text-surface"
                      : "border border-line bg-surface text-ink"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
          {!value.forSelf ? (
            <input
              value={value.recipient}
              onChange={(event) =>
                onChange({
                  ...value,
                  forSelf: false,
                  recipient: event.target.value,
                })
              }
              placeholder={t("gifts.recipientPlaceholder")}
              className={compactFieldClass}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
