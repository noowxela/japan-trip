import Link from "next/link";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";
import { hasToken, isConfigured } from "@/lib/notion";

export const dynamic = "force-dynamic";

const secondaryLinks = [
  { href: "/today", label: "Today", detail: "Focused view of the current day" },
  { href: "/map", label: "Map", detail: "City path and place pins" },
  { href: "/lists", label: "Lists", detail: "Places, stays, and transit" },
  { href: "/places", label: "Places", detail: "All sights and stops" },
  { href: "/stays", label: "Stays", detail: "Hotels and lodging" },
  { href: "/transit", label: "Transit", detail: "Trains, flights, and moves" },
];

export default function SettingsPage() {
  const notionReady = hasToken() && isConfigured();

  return (
    <>
      <Nav current="/settings" />
      <PageShell>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            App
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
            Status
          </h2>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-sm font-medium text-stone-800">Notion sync</p>
            <p className="mt-1 text-sm text-stone-500">
              {notionReady
                ? "Connected — itinerary data loads from Notion."
                : "Not configured — add NOTION_TOKEN and database IDs in .env.local."}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
            More tools
          </h2>
          <ul className="grid gap-2">
            {secondaryLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-stone-800">{link.label}</p>
                    <p className="text-sm text-stone-500">{link.detail}</p>
                  </div>
                  <span className="shrink-0 text-stone-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-500">
          <p className="font-medium text-stone-700">Japan Trip</p>
          <p className="mt-1">
            Mobile-first itinerary companion synced with Notion. Prep checklist
            is stored locally on this device.
          </p>
        </section>
      </PageShell>
    </>
  );
}
