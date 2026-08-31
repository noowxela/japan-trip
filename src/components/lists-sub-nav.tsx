import Link from "next/link";

const links = [
  { href: "/lists", label: "Overview" },
  { href: "/places", label: "Places" },
  { href: "/stays", label: "Stays" },
  { href: "/transit", label: "Transit" },
];

export function ListsSubNav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-1 rounded-2xl border border-stone-200 bg-white p-1">
      {links.map((link) => {
        const active = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-[#b42318] text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
