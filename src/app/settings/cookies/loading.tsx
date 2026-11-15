import { SkeletonHeader, SkeletonPage, SkeletonRows } from "@/components/compact";

export default function CookieLabLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <section className="space-y-1.5" aria-hidden>
        <SkeletonRows rows={4} />
      </section>
    </SkeletonPage>
  );
}
