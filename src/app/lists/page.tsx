import Link from "next/link";
import { Nav } from "@/components/nav";
import { cardClass, eyebrowClass, PageShell } from "@/components/page-shell";
import { ListsSubNav } from "@/components/lists-sub-nav";
import { listCounts, getPlaces, getStays, getTransit } from "@/lib/trip";

export const dynamic = "force-dynamic";

const lists = [
  { href: "/places", label: "Places", hint: "Sights, food, shops" },
  { href: "/stays", label: "Stays", hint: "Hotels and bookings" },
  { href: "/transit", label: "Transit", hint: "Trains, flights, metro" },
];

export default async function ListsPage() {
  const [places, stays, transit] = await Promise.all([
    getPlaces(),
    getStays(),
    getTransit(),
  ]);
  const counts = listCounts(places, stays, transit);

  return (
    <>
      <Nav current="/lists" />
      <PageShell>
        <div>
          <p className={eyebrowClass}>
            Databases
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Lists</h1>
        </div>
        <ListsSubNav current="/lists" />
        <ul className="grid gap-3 sm:grid-cols-3">
          {lists.map((list) => (
            <li key={list.href}>
              <Link
                href={list.href}
                className={`notebook-press block ${cardClass}`}
              >
                <p className="text-lg font-medium">{list.label}</p>
                <p className="text-sm text-stone-500">{list.hint}</p>
                <p className="mt-2 text-xs font-medium text-moss">
                  {list.href === "/places"
                    ? `${counts.places} places · ${counts.pending} pending`
                    : list.href === "/stays"
                      ? `${counts.stays} stays`
                      : `${counts.transit} moves`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </PageShell>
    </>
  );
}
