import { PrepChecklist } from "@/components/prep-checklist";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";

export const dynamic = "force-dynamic";

export default function PrepPage() {
  return (
    <>
      <Nav current="/prep" />
      <PageShell>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-moss">
            Before you go
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Prep list</h1>
          <p className="mt-1 text-sm text-stone-500">
            Track packing and booking tasks for the trip. Saved on this device.
          </p>
        </div>
        <PrepChecklist />
      </PageShell>
    </>
  );
}
