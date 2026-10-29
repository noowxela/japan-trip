import { TripMapSkeleton } from "@/components/page-skeletons";

export default function MapLoading() {
  return (
    <main className="fixed inset-x-0 top-0 bottom-[var(--tab-bar-height,4.25rem)] z-10 overflow-hidden">
      <TripMapSkeleton />
    </main>
  );
}
