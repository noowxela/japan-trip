import Link from "next/link";

const links = [
  { href: "/lists", label: "Overview" },
  { href: "/places", label: "Places" },
  { href: "/stays", label: "Stays" },
  { href: "/transit", label: "Transit" },
];

export function ListsSubNav({ current }: { current: string }) {
  return (
    <nav className="notebook-card flex flex-wrap gap-1 p-1">
      {links.map((link) => {
        const active = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`notebook-btn px-3 py-1.5 text-sm font-medium ${
              active
                ? "bg-moss text-white"
                : "text-stone-600 hover:bg-sage/70"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
