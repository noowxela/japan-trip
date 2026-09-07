import Link from "next/link";
import { AppVersionCard } from "@/components/app-version-card";
import { HapticToggle } from "@/components/haptic-toggle";
import { UnlockEditorCard } from "@/components/unlock-editor-card";
import {
  eyebrowClass,
  PageShell,
  settingsGroupClass,
  settingsRowClass,
} from "@/components/page-shell";
import { formatAppVersion } from "@/lib/app-version";
import { hasToken, isConfigured } from "@/lib/notion";
import { getDays } from "@/lib/trip";

export const dynamic = "force-dynamic";

function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0 text-stone-300"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export default async function SettingsPage() {
  const notionReady = hasToken() && isConfigured();
  const days = notionReady ? await getDays() : [];

  const tripLinks = [
    {
      href: "/days",
      label: "Trip days",
      detail: days.length
        ? `${days.length} itinerary ${days.length === 1 ? "day" : "days"}`
        : "Add, edit, and manage itinerary days",
    },
  ];

  const toolLinks = [
    { href: "/today", label: "Today", detail: "Focused view of the current day" },
    { href: "/map", label: "Map", detail: "City path and place pins" },
    { href: "/lists", label: "Lists", detail: "Places, stays, and transit" },
    { href: "/places", label: "Places", detail: "All sights and stops" },
    { href: "/stays", label: "Stays", detail: "Hotels and lodging" },
    { href: "/transit", label: "Transit", detail: "Trains, flights, and moves" },
  ];

  return (
    <>
      <PageShell>
        <div>
          <p className={eyebrowClass}>App</p>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        </div>

        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-stone-500">
            Status
          </h2>
          <div className={`${settingsGroupClass} px-4 py-3`}>
            <p className="text-[17px] font-medium text-stone-800">Notion sync</p>
            <p className="mt-0.5 text-sm text-stone-500">
              {notionReady
                ? "Connected — itinerary data loads from Notion."
                : "Not configured — add NOTION_TOKEN and database IDs in .env.local."}
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-stone-500">
            Trip
          </h2>
          <ul className={settingsGroupClass}>
            {tripLinks.map((link) => (
              <li key={link.href} className="border-b border-stone-100 last:border-b-0">
                <Link href={link.href} className={settingsRowClass}>
                  <div className="min-w-0">
                    <p className="text-[17px] text-stone-900">{link.label}</p>
                    <p className="text-sm text-stone-500">{link.detail}</p>
                  </div>
                  <Chevron />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-stone-500">
            Device
          </h2>
          <HapticToggle />
        </section>

        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-stone-500">
            Editing
          </h2>
          <UnlockEditorCard />
        </section>

        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-stone-500">
            More
          </h2>
          <ul className={settingsGroupClass}>
            {toolLinks.map((link) => (
              <li key={link.href} className="border-b border-stone-100 last:border-b-0">
                <Link href={link.href} className={settingsRowClass}>
                  <div className="min-w-0">
                    <p className="text-[17px] text-stone-900">{link.label}</p>
                    <p className="text-sm text-stone-500">{link.detail}</p>
                  </div>
                  <Chevron />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-stone-500">
            About
          </h2>
          <AppVersionCard />
        </section>

        <section className={`${settingsGroupClass} mb-2 px-4 py-3 text-sm text-stone-500`}>
          <p className="font-medium text-stone-700">Japan Trip</p>
          <p className="mt-1">
            Mobile-first itinerary companion synced with Notion. Prep checklist
            is stored locally on this device.
          </p>
          <p className="mt-2 text-xs tabular-nums text-stone-400">
            {formatAppVersion()}
          </p>
        </section>
      </PageShell>
    </>
  );
}
