import Link from "next/link";
import { navInnerClass } from "@/components/page-shell";

const links = [
  { href: "/", label: "Overview" },
  { href: "/prep", label: "Prep" },
  { href: "/schedule", label: "Schedule" },
  { href: "/budget", label: "Expenses" },
  { href: "/settings", label: "Settings" },
];

function isActive(current: string, href: string) {
  if (href === "/") return current === "/";
  if (href === "/schedule") {
    return (
      current === "/schedule" ||
      current === "/today" ||
      current.startsWith("/days/")
    );
  }
  if (href === "/settings") {
    return current === "/settings" || current === "/days";
  }
  if (href === "/budget") {
    return current === "/budget" || current === "/spend";
  }
  return current === href;
}

export function Nav({ current }: { current: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-sage/80 bg-paper/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
      <div className={`${navInnerClass}`}>
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold tracking-tight text-stone-900"
        >
          Japan Trip
        </Link>
        <nav className="hidden min-w-0 flex-wrap justify-end gap-1 text-xs sm:text-sm md:flex">
          {links.map((link) => {
            const active = isActive(current, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`notebook-btn px-2.5 py-1 sm:px-3 ${
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
      </div>
    </header>
  );
}
