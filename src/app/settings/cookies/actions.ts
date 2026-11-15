"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VISITOR_COOKIE, visitorCookieOptions } from "@/lib/visitor";

export async function clearVisitorCookie() {
  const jar = await cookies();
  jar.set(VISITOR_COOKIE, "", { ...visitorCookieOptions(), maxAge: 0 });
  redirect("/settings/cookies");
}
