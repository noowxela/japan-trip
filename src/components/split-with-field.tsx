"use client";

import { useT } from "@/components/i18n-provider";
import { normalizeSplitWith } from "@/lib/spend";
import {
  spendPartyChipClass,
  spendPartyChipOffClass,
  spendPartyChipOnClass,
  spendPartyFieldClass,
} from "@/lib/spend-party-row";

/** Multi-select of who shares an expense. `value` empty = everyone. */
export function SplitWithField({
  people,
  value,
  onChange,
}: {
  people: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useT();
  if (people.length === 0 && value.length === 0) return null;

  const everyone = value.length === 0;
  const names = [...people, ...value.filter((name) => !people.includes(name))];
  const selected = everyone ? people : value;

  function toggle(name: string) {
    const next = selected.includes(name)
      ? selected.filter((entry) => entry !== name)
      : [...selected, name];
    if (next.length === 0) return;
    onChange(normalizeSplitWith(next, people));
  }

  return (
    <div className={spendPartyFieldClass} role="group" aria-label={t("form.splitWith")}>
      <span className="text-xs font-medium text-ink-muted">{t("form.splitWith")}</span>
      {value.map((name) => (
        <input key={name} type="hidden" name="splitWith" value={name} />
      ))}
      <div className="flex flex-wrap gap-1.5">
        {names.map((name) => {
          const on = selected.includes(name);
          return (
            <button
              key={name}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(name)}
              className={`${spendPartyChipClass} ${on ? spendPartyChipOnClass : spendPartyChipOffClass}`}
            >
              {on ? "✓ " : ""}
              {name}
            </button>
          );
        })}
        {people.length > 0 ? (
          <button
            type="button"
            aria-pressed={everyone}
            onClick={() => onChange([])}
            className={`${spendPartyChipClass} ${everyone ? "bg-ink text-surface" : spendPartyChipOffClass}`}
          >
            {t("form.splitAll")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
