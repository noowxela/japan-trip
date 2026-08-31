import { PageShell } from "@/components/page-shell";

export default function LoadingDay() {
  return (
    <PageShell>
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-40 rounded-full bg-stone-200/70" />
        <div className="h-28 rounded-2xl bg-stone-200/70" />
        <div className="h-64 rounded-2xl bg-stone-200/70" />
        <div className="space-y-3">
          <div className="h-24 rounded-2xl bg-stone-200/70" />
          <div className="h-24 rounded-2xl bg-stone-200/70" />
        </div>
      </div>
    </PageShell>
  );
}
