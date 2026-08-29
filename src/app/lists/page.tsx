import Link from "next/link";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";

export const dynamic = "force-dynamic";

const lists = [
  { href: "/places", label: "Places", hint: "Sights, food, shops" },
  { href: "/stays", label: "Stays", hint: "Hotels and bookings" },
  { href: "/transit", label: "Transit", hint: "Trains, flights, metro" },
];

export default function ListsPage() {
  return (
    <>
      <Nav current="/lists" />
      <PageShell>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#b42318]">
            Databases
          </p>
          <h1 className="font-serif text-3xl tracking-tight">Lists</h1>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {lists.map((list) => (
            <li key={list.href}>
              <Link
                href={list.href}
                className="block rounded-2xl border border-stone-200 bg-white p-4"
              >
                <p className="text-lg font-medium">{list.label}</p>
                <p className="text-sm text-stone-500">{list.hint}</p>
              </Link>
            </li>
          ))}
        </ul>
      </PageShell>
    </>
  );
}
