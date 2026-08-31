import { FlightLoading } from "@/components/flight-loading";
import { PageShell } from "@/components/page-shell";

export default function LoadingHome() {
  return (
    <PageShell>
      <FlightLoading />
    </PageShell>
  );
}
