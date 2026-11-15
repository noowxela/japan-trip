"use client";

import { useEffect } from "react";
import { overviewHardNavHref } from "@/lib/overview-hard-nav";

/**
 * Intercepts in-app link clicks on Overview (including the bottom tab bar)
 * and turns them into a full page load, so leaving `/` does not depend on
 * a client RSC navigation that may never commit.
 */
export function OverviewHardNav() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const href = overviewHardNavHref(
        event,
        window.location.origin,
        window.location.pathname,
      );
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      window.location.assign(href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
