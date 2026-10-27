import { setLocale, setTheme } from "@/app/actions";
import { AppVersionCard } from "@/components/app-version-card";
import {
  CompactRow,
  CompactRowList,
  PageHeader,
  SectionHeader,
} from "@/components/compact";
import { HapticToggle } from "@/components/haptic-toggle";
import { PushRemindersCard } from "@/components/push-reminders-card";
import { UnlockEditorCard } from "@/components/unlock-editor-card";
import { PageShell, settingsGroupClass } from "@/components/page-shell";
import { formatAppVersion } from "@/lib/app-version";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { notionReady } from "@/lib/notion";
import { isPushStoreWritable } from "@/lib/push-store";
import { getThemePreference } from "@/lib/theme-server";
import { getDays } from "@/lib/trip";

export const dynamic = "force-dynamic";

function Chevron() {
  return (
    <span className="pr-1 text-[12px] text-ink-muted" aria-hidden>
      ›
    </span>
  );
}

export default async function SettingsPage() {
  const locale = await getLocale();
  const themePreference = await getThemePreference();
  const ready = notionReady();
  const days = ready ? await getDays() : [];
  const vapidPublicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    "";
  const pushStoreWritable = isPushStoreWritable();

  const tripLinks = [
    {
      href: "/days",
      label: t(locale, "more.tripDays"),
      detail: days.length
        ? t(
            locale,
            days.length === 1 ? "more.tripDaysCount" : "more.tripDaysCountPlural",
            { n: days.length },
          )
        : t(locale, "more.tripDaysDetail"),
    },
  ];

  const toolLinks = [
    {
      href: "/prep",
      label: t(locale, "more.prep"),
      detail: t(locale, "more.prepDetail"),
    },
    {
      href: "/phrases",
      label: t(locale, "more.phrases"),
      detail: t(locale, "more.phrasesDetail"),
    },
    {
      href: "/lists",
      label: t(locale, "more.lists"),
      detail: t(locale, "more.listsDetail"),
    },
    {
      href: "/places",
      label: t(locale, "more.places"),
      detail: t(locale, "more.placesDetail"),
    },
    {
      href: "/stays",
      label: t(locale, "more.stays"),
      detail: t(locale, "more.staysDetail"),
    },
    {
      href: "/transit",
      label: t(locale, "more.transit"),
      detail: t(locale, "more.transitDetail"),
    },
  ];

  const languages = [
    { lang: "zh", label: t(locale, "lang.zh") },
    { lang: "en", label: t(locale, "lang.en") },
  ] as const;

  const themes = [
    { theme: "system", label: t(locale, "theme.system") },
    { theme: "light", label: t(locale, "theme.light") },
    { theme: "dark", label: t(locale, "theme.dark") },
  ] as const;

  return (
    <>
      <PageShell>
        <PageHeader
          eyebrow={t(locale, "more.eyebrow")}
          title={t(locale, "more.title")}
        />

        <section className="space-y-1.5">
          <SectionHeader title={t(locale, "lang.section")} />
          <div
            role="group"
            aria-label={t(locale, "lang.label")}
            className="flex h-8 overflow-hidden rounded-lg bg-canvas p-0.5"
          >
            {languages.map((item) => {
              const active = locale === item.lang;
              return (
                <form key={item.lang} action={setLocale} className="min-w-0 flex-1">
                  <input type="hidden" name="lang" value={item.lang} />
                  <button
                    type="submit"
                    aria-pressed={active}
                    className={`flex h-full w-full items-center justify-center rounded-md px-2 text-[12px] font-medium ${
                      active ? "bg-surface text-ink shadow-sm" : "text-ink-muted"
                    }`}
                  >
                    {item.label}
                  </button>
                </form>
              );
            })}
          </div>
        </section>

        <section className="space-y-1.5">
          <SectionHeader title={t(locale, "theme.section")} />
          <div
            role="group"
            aria-label={t(locale, "theme.label")}
            className="flex h-8 overflow-hidden rounded-lg bg-canvas p-0.5"
          >
            {themes.map((item) => {
              const active = themePreference === item.theme;
              return (
                <form key={item.theme} action={setTheme} className="min-w-0 flex-1">
                  <input type="hidden" name="theme" value={item.theme} />
                  <button
                    type="submit"
                    aria-pressed={active}
                    className={`flex h-full w-full items-center justify-center rounded-md px-1.5 text-[12px] font-medium ${
                      active ? "bg-surface text-ink shadow-sm" : "text-ink-muted"
                    }`}
                  >
                    {item.label}
                  </button>
                </form>
              );
            })}
          </div>
        </section>

        <section className="space-y-1.5">
          <SectionHeader title={t(locale, "more.tripTools")} />
          <CompactRowList>
            {toolLinks.map((link) => (
              <li key={link.href}>
                <CompactRow
                  href={link.href}
                  title={link.label}
                  secondary={link.detail}
                  trailing={<Chevron />}
                />
              </li>
            ))}
          </CompactRowList>
        </section>

        <section className="space-y-1.5">
          <SectionHeader title={t(locale, "more.status")} />
          <CompactRowList>
            <li>
              <CompactRow
                title={t(locale, "more.notionSync")}
                secondary={
                  ready
                    ? t(locale, "more.notionConnected")
                    : t(locale, "more.notionMissing")
                }
              />
            </li>
          </CompactRowList>
        </section>

        <section className="space-y-1.5">
          <SectionHeader title={t(locale, "more.trip")} />
          <CompactRowList>
            {tripLinks.map((link) => (
              <li key={link.href}>
                <CompactRow
                  href={link.href}
                  title={link.label}
                  secondary={link.detail}
                  trailing={<Chevron />}
                />
              </li>
            ))}
          </CompactRowList>
        </section>

        <section className="space-y-1.5">
          <SectionHeader title={t(locale, "more.device")} />
          <HapticToggle />
          <PushRemindersCard
            vapidPublicKey={vapidPublicKey}
            storeWritable={pushStoreWritable}
          />
        </section>

        <section className="space-y-1.5">
          <SectionHeader title={t(locale, "more.editing")} />
          <UnlockEditorCard />
        </section>

        <section className="space-y-1.5">
          <SectionHeader title={t(locale, "more.about")} />
          <AppVersionCard />
        </section>

        <section
          className={`${settingsGroupClass} mb-2 px-3 py-2.5 text-[12px] text-ink-muted`}
        >
          <p className="text-[14px] font-medium text-ink">
            {t(locale, "more.appName")}
          </p>
          <p className="mt-0.5">{t(locale, "more.aboutBody")}</p>
          <p className="mt-1.5 text-[11px] tabular-nums text-ink-muted">
            {formatAppVersion()}
          </p>
        </section>
      </PageShell>
    </>
  );
}
