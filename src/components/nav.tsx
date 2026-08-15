import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/spend", label: "Spend" },
  { href: "/lists", label: "Lists" },
];

export function Nav({ current }: { current: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-[#f6f1e8]/90 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-serif text-lg tracking-tight text-stone-900">
          Japan Trip
        </Link>
        <nav className="flex gap-1 text-sm">
          {links.map((link) => {
            const active =
              current === link.href ||
              (link.href === "/lists" &&
                ["/places", "/stays", "/transit", "/lists"].includes(current));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1 ${
                  active
                    ? "bg-[#b42318] text-white"
                    : "text-stone-600 hover:bg-stone-200/70"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
