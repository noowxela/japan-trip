import { cookies } from "next/headers";
import { getEditorSession } from "@/lib/edit-session";
import {
  VISITOR_COOKIE,
  isVisitorStoreWritable,
  listVisitors,
} from "@/lib/visitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getEditorSession();
  if (!session.canEdit) {
    return Response.json(
      { error: "Unlock editing in Settings first" },
      { status: 401 },
    );
  }
  const jar = await cookies();
  const visitors = await listVisitors();
  return Response.json({
    visitors,
    me: jar.get(VISITOR_COOKIE)?.value ?? null,
    writable: isVisitorStoreWritable(),
  });
}
