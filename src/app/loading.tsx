import { PageShell } from "@/components/page-shell";

export default function LoadingHome() {
  return (
    <PageShell>
      <div className="animate-pulse space-y-6">
        <div className="h-24 rounded-2xl bg-stone-200/70" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 rounded-2xl bg-stone-200/70" />
          <div className="h-28 rounded-2xl bg-stone-200/70" />
        </div>
        <div className="h-40 rounded-2xl bg-stone-200/70" />
      </div>
    </PageShell>
  );
}
