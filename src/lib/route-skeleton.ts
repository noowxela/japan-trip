/**
 * Which skeleton the root `app/loading.tsx` shows. It is the Suspense boundary
 * for `/` and for `/budget` (whose data loads in `budget/layout.tsx`, above any
 * `budget/loading.tsx`); every other route has its own `loading.tsx`.
 */
export type RootSkeleton = "overview" | "budget";

export function rootSkeletonFor(pathname: string | null | undefined): RootSkeleton {
  if (!pathname) return "overview";
  return pathname === "/budget" || pathname.startsWith("/budget/")
    ? "budget"
    : "overview";
}
