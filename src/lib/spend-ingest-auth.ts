import { timingSafeEqual } from "node:crypto";

/** True when `Authorization: Bearer ${SPEND_INGEST_SECRET}` matches (constant-time). */
export function authorizeSpendIngest(request: Request): boolean {
  const secret = process.env.SPEND_INGEST_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
