"use client";

import { useT } from "@/components/i18n-provider";
import { fieldClass } from "@/components/page-shell";
import { formatRm, formatSpend } from "@/lib/format";
import { spendMultiplier, toRm } from "@/lib/spend";
import type { SpendCurrency } from "@/lib/types";

export function eachPaidOwnCount(
  splitWith: string[],
  people: string[],
  paidBy = "",
) {
  return spendMultiplier(
    { eachPaidOwn: true, splitWith, paidBy },
    people,
  );
}

export function EachPaidOwnSubtotal({
  amount,
  currency,
  count,
  jpyPerRm,
}: {
  amount: number | null;
  currency: SpendCurrency;
  count: number;
  jpyPerRm?: number;
}) {
  const { t } = useT();
  const valid = amount != null && Number.isFinite(amount) && count > 0;
  const subtotal = valid ? amount * count : null;
  const showRm =
    valid &&
    currency === "Yen" &&
    jpyPerRm != null &&
    jpyPerRm > 0;
  const rm = showRm && subtotal != null ? toRm(subtotal, currency, jpyPerRm) : null;

  return (
    <div className="grid gap-1">
      <span className="text-[12px] font-medium text-ink-muted">
        {t("form.subtotal")}
      </span>
      <div
        className={`${fieldClass} flex items-center bg-canvas text-ink tabular-nums`}
        aria-live="polite"
      >
        {subtotal == null ? (
          "—"
        ) : (
          <>
            <span>{formatSpend(subtotal, currency)}</span>
            {rm != null ? (
              <span className="ml-2 text-ink-muted">≈ {formatRm(rm)}</span>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
