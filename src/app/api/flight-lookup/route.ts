import { NextResponse } from "next/server";
import { lookupFlightByNumber } from "@/lib/flight-lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ error: "missing_q" }, { status: 400 });
  }
  try {
    const result = await lookupFlightByNumber(q);
    if (!result) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
  }
}
