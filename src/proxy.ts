import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";
import { EDITOR_COOKIE, verifyEditorToken } from "@/lib/editor-token";
import {
  VISITOR_COOKIE,
  clientIp,
  isValidVisitorId,
  parseUserAgent,
  parseVercelGeo,
  recordVisit,
  shouldLogVisit,
  visitorCookieOptions,
} from "@/lib/visitor";

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const response = NextResponse.next();
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = isValidVisitorId(existing) ? existing : crypto.randomUUID();
  response.cookies.set(VISITOR_COOKIE, visitorId, visitorCookieOptions());

  const pathname = request.nextUrl.pathname;
  const userAgent = request.headers.get("user-agent");
  if (
    shouldLogVisit({
      pathname,
      method: request.method,
      userAgent,
      headers: request.headers,
    })
  ) {
    const editorName = verifyEditorToken(
      request.cookies.get(EDITOR_COOKIE)?.value,
    );
    event.waitUntil(
      recordVisit({
        id: visitorId,
        path: pathname,
        ip: clientIp(request.headers),
        geo: parseVercelGeo(request.headers),
        ua: parseUserAgent(userAgent),
        language: request.headers.get("accept-language"),
        referer: request.headers.get("referer"),
        editorUnlocked: Boolean(editorName),
        editorName,
      }),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/webpack|serwist/|favicon.ico|icon(?:\\.png)?$|apple-icon|opengraph-image|twitter-image|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$).*)",
  ],
};
