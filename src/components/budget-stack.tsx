"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function BudgetStack({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const stacked = pathname.startsWith("/budget/");

  return (
    <div inert={stacked} aria-hidden={stacked}>
      {children}
    </div>
  );
}
