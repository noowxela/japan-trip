import Link from "next/link";
import { navInnerClass } from "@/components/page-shell";

const links = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/spend", label: "Spend" },
  { href: "/lists", label: "Lists" },
];

export function Nav({ current }: { current: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-[#f6f1e8]/90 backdrop-blur">
      <div className={`${navInnerClass}`}>
        <Link
          href="/"
          className="shrink-0 font-serif text-lg tracking-tight text-stone-900"
        >
          Japan Trip
        </Link>
        <nav className="flex min-w-0 flex-wrap justify-end gap-1 text-xs sm:text-sm">
          {links.map((link) => {
            const active =
              current === link.href ||
              (link.href === "/lists" &&
                ["/places", "/stays", "/transit", "/lists"].includes(current));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-2.5 py-1 sm:px-3 ${
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
