import { CopyButton } from "@/components/copy-button";
import { btnPrimaryClass, settingsGroupClass } from "@/components/page-shell";
import { t, type Locale } from "@/lib/i18n/dictionaries";

const AUTH_PLACEHOLDER = "Bearer SPEND_INGEST_SECRET";

export function ApplePayShortcutsCard({
  locale,
  postUrl,
  shortcutUrl,
}: {
  locale: Locale;
  postUrl: string;
  /** iCloud Shortcuts share URL from NEXT_PUBLIC_APPLE_PAY_SHORTCUT_URL */
  shortcutUrl?: string;
}) {
  const steps = [
    "more.applePayStep1",
    "more.applePayStep2",
    "more.applePayStep3",
    "more.applePayStep4",
    "more.applePayStep5",
  ] as const;

  const installReady = Boolean(shortcutUrl?.trim());

  return (
    <div className={`${settingsGroupClass} px-4 py-3`}>
      <div className="space-y-2">
        {installReady ? (
          <a
            href={shortcutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnPrimaryClass} min-h-11 w-full no-underline`}
          >
            {t(locale, "more.applePayInstall")}
          </a>
        ) : (
          <>
            <button
              type="button"
              disabled
              className={`${btnPrimaryClass} min-h-11 w-full`}
            >
              {t(locale, "more.applePayInstall")}
            </button>
            <p className="text-[11px] text-ink-muted">
              {t(locale, "more.applePayInstallPending")}
            </p>
          </>
        )}
      </div>

      <p className="mt-3 text-[13px] text-ink">
        {t(locale, "more.applePayBody")}
      </p>
      <p className="mt-2 text-[12px] text-ink-muted">
        {t(locale, "more.applePayDefaults")}
      </p>
      <p className="mt-3 text-[12px] font-medium text-ink">
        {t(locale, "more.applePayManualTitle")}
      </p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[12px] text-ink-muted">
        {steps.map((key) => (
          <li key={key}>{t(locale, key)}</li>
        ))}
      </ol>
      <dl className="mt-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <dt className="text-[11px] text-ink-muted">
              {t(locale, "more.applePayUrl")}
            </dt>
            <dd className="truncate font-mono text-[12px] text-ink">{postUrl}</dd>
          </div>
          <CopyButton value={postUrl} icon />
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <dt className="text-[11px] text-ink-muted">
              {t(locale, "more.applePayAuth")}
            </dt>
            <dd className="truncate font-mono text-[12px] text-ink">
              {AUTH_PLACEHOLDER}
            </dd>
          </div>
          <CopyButton value={AUTH_PLACEHOLDER} icon />
        </div>
      </dl>
      <p className="mt-2 text-[11px] text-ink-muted">
        {t(locale, "more.applePaySecretHint")}
      </p>
    </div>
  );
}
