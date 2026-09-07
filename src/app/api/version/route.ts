import { getDeployCommit, getDeployVersion } from "@/lib/app-version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export function GET() {
  return Response.json(
    {
      version: getDeployVersion(),
      commit: getDeployCommit(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
