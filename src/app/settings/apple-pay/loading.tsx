import { SkeletonHeader, SkeletonPage, SkeletonRows } from "@/components/compact";

export default function ApplePaySettingsLoading() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <section className="space-y-1.5" aria-hidden>
        <SkeletonRows rows={1} />
      </section>
    </SkeletonPage>
  );
}
