"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/components/i18n-provider";

const TOP_PX = 24;
const DELTA_PX = 10;

function useScrollHideTabBar() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setHidden(false);
  }

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const apply = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      lastY = y;

      if (y <= TOP_PX) {
        setHidden(false);
        return;
      }
      if (delta > DELTA_PX) setHidden(true);
      else if (delta < -DELTA_PX) setHidden(false);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  useEffect(() => {
    document.documentElement.dataset.tabBar = hidden ? "hidden" : "shown";
    return () => {
      delete document.documentElement.dataset.tabBar;
    };
  }, [hidden]);

  return hidden;
}

export function BottomNav() {
  const pathname = usePathname();
  const hidden = useScrollHideTabBar();
  const { t } = useT();

  if (pathname === "/schedule") return null;

  const tabs = [
    {
      href: "/",
      label: t("nav.overview"),
      match: (path: string) => path === "/",
      icon: OverviewIcon,
    },
    {
      href: "/schedule",
      label: t("nav.schedule"),
      match: (path: string) => path === "/schedule",
      icon: ScheduleIcon,
    },
    {
      href: "/map",
      label: t("nav.map"),
      match: (path: string) => path === "/map",
      icon: MapIcon,
    },
    {
      href: "/budget",
      label: t("nav.expenses"),
      match: (path: string) =>
        path === "/budget" ||
        path.startsWith("/budget/") ||
        path === "/spend" ||
        path.startsWith("/spend"),
      icon: BudgetIcon,
    },
    {
      href: "/settings",
      label: t("nav.more"),
      match: (path: string) =>
        path === "/settings" ||
        path === "/prep" ||
        path === "/phrases" ||
        path === "/lists" ||
        path === "/places" ||
        path === "/stays" ||
        path === "/transit" ||
        path === "/days",
      icon: MoreIcon,
    },
  ] as const;

  return (
    <nav
      aria-label={t("nav.main")}
      inert={hidden || undefined}
      className="tab-bar fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-xl items-stretch justify-around px-1 pt-1 md:max-w-5xl">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`notebook-press flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium leading-tight transition-transform motion-reduce:transition-none ${
                active
                  ? "scale-[1.02] text-accent"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon active={active} />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function OverviewIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.25 : 1.75}
    >
      <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

function ScheduleIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.25 : 1.75}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.25 : 1.75}
    >
      <path d="M9 3 3 5.5V21l6-2.5 6 2.5 6-2.5V3l-6 2.5L9 3Z" />
      <path d="M9 3v15.5M15 5.5V21" />
    </svg>
  );
}

function BudgetIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.25 : 1.75}
    >
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.25 : 1.75}
    >
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
