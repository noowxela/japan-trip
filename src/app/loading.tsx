import { FlightLoading } from "@/components/flight-loading";
import { Nav } from "@/components/nav";
import { PageShell } from "@/components/page-shell";

export default function Loading() {
  return (
    <>
      <Nav current="/" />
      <PageShell>
        <FlightLoading />
      </PageShell>
    </>
  );
}
