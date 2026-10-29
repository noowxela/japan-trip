"use client";

import { usePathname } from "next/navigation";
import { BudgetSkeleton, OverviewSkeleton } from "@/components/page-skeletons";
import { rootSkeletonFor } from "@/lib/route-skeleton";

export default function RootLoading() {
  const pathname = usePathname();
  return rootSkeletonFor(pathname) === "budget" ? (
    <BudgetSkeleton />
  ) : (
    <OverviewSkeleton />
  );
}
