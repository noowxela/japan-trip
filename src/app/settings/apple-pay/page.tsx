import { headers } from "next/headers";
import { ApplePayShortcutsCard } from "@/components/apple-pay-shortcuts-card";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageHeader } from "@/components/compact";
import { PageShell } from "@/components/page-shell";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

async function requestOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  if (host) return `${proto}://${host}`;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return vercel ? `https://${vercel}` : "";
}

export default async function ApplePaySettingsPage() {
  const locale = await getLocale();
  const origin = await requestOrigin();
  const spendIngestUrl = `${origin || ""}/api/spend`;
  const shortcutUrl =
    process.env.NEXT_PUBLIC_APPLE_PAY_SHORTCUT_URL?.trim() || "";

  return (
    <PageShell>
      <Breadcrumb
        items={[
          { href: "/settings", label: t(locale, "more.title") },
          { label: t(locale, "more.applePay") },
        ]}
      />
      <PageHeader
        eyebrow={t(locale, "more.eyebrow")}
        title={t(locale, "more.applePay")}
      />
      <ApplePayShortcutsCard
        locale={locale}
        postUrl={spendIngestUrl}
        shortcutUrl={shortcutUrl}
      />
    </PageShell>
  );
}
