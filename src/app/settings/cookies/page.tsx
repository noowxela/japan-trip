import { cookies, headers } from "next/headers";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageHeader } from "@/components/compact";
import { CookieLab } from "@/components/cookie-lab";
import { PageShell } from "@/components/page-shell";
import { getEditorSession } from "@/lib/edit-session";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import {
  VISITOR_COOKIE,
  clientIp,
  formatGeo,
  isVisitorStoreWritable,
  listVisitors,
  parseUserAgent,
  parseVercelGeo,
} from "@/lib/visitor";

export const dynamic = "force-dynamic";

export default async function CookieLabPage() {
  const locale = await getLocale();
  const [headerList, jar, session] = await Promise.all([
    headers(),
    cookies(),
    getEditorSession(),
  ]);
  const visitorId = jar.get(VISITOR_COOKIE)?.value ?? null;
  const ua = parseUserAgent(headerList.get("user-agent"));
  const listed = isVisitorStoreWritable() ? await listVisitors() : [];
  const mine = visitorId
    ? (listed.find((row) => row.id === visitorId) ?? null)
    : null;
  const visitors = session.canEdit ? listed : [];

  return (
    <PageShell>
      <Breadcrumb
        items={[
          { href: "/settings", label: t(locale, "more.title") },
          { label: t(locale, "cookieLab.title") },
        ]}
      />
      <PageHeader
        eyebrow={t(locale, "cookieLab.eyebrow")}
        title={t(locale, "cookieLab.title")}
      />
      <CookieLab
        locale={locale}
        ip={clientIp(headerList)}
        geo={formatGeo(parseVercelGeo(headerList))}
        device={ua.device}
        os={ua.os}
        browser={ua.browser}
        language={headerList.get("accept-language")}
        referer={headerList.get("referer")}
        visitorId={visitorId}
        visitCount={mine?.visitCount ?? (visitorId ? 1 : null)}
        firstSeen={mine?.firstSeen ?? (visitorId ? new Date().toISOString() : null)}
        lastSeen={mine?.lastSeen ?? (visitorId ? new Date().toISOString() : null)}
        cookies={jar.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }))}
        canEdit={session.canEdit}
        visitors={visitors}
        storeWritable={isVisitorStoreWritable()}
      />
    </PageShell>
  );
}
