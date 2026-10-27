import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppUpdateProvider } from "@/components/app-update-provider";
import { BottomNav } from "@/components/bottom-nav";
import { CacheFallbackProvider } from "@/components/cache-fallback";
import { EditSessionProvider } from "@/components/edit-session";
import { HapticProvider } from "@/components/haptic-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { OutboxProvider } from "@/components/outbox-provider";
import { QuickExpenseProvider } from "@/components/quick-expense-provider";
import { SerwistProvider } from "@/components/serwist-provider";
import { SyncBadge } from "@/components/sync-badge";
import { ToastProvider } from "@/components/toast-provider";
import { UnlockProvider } from "@/components/unlock-provider";
import { getEditorSession } from "@/lib/edit-session";
import { t } from "@/lib/i18n/dictionaries";
import { getLocale } from "@/lib/i18n/server";
import { themeBootScript } from "@/lib/theme";
import { getThemePreference } from "@/lib/theme-server";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const siteTitle =
    locale === "zh" ? t("zh", "meta.title") : t("en", "meta.title");
  const siteDescription =
    locale === "zh"
      ? t("zh", "meta.description")
      : t("en", "meta.description");

  return {
    metadataBase: new URL(
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000",
    ),
    title: siteTitle,
    description: siteDescription,
    applicationName: siteTitle,
    appleWebApp: {
      capable: true,
      title: siteTitle,
      statusBarStyle: "default",
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      siteName: siteTitle,
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [editor, locale, themePreference] = await Promise.all([
    getEditorSession(),
    getLocale(),
    getThemePreference(),
  ]);

  const dataTheme =
    themePreference === "light" || themePreference === "dark"
      ? themePreference
      : undefined;

  return (
    <html
      lang={locale === "zh" ? "zh-CN" : "en"}
      className={`${nunito.variable} h-full antialiased`}
      {...(dataTheme ? { "data-theme": dataTheme } : {})}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeBootScript(themePreference),
          }}
        />
      </head>
      <body className="min-h-full overflow-x-hidden bg-canvas font-sans text-ink">
        <SerwistProvider
          swUrl="/serwist/sw.js"
          disable={process.env.NODE_ENV === "development"}
        >
          <I18nProvider locale={locale}>
            <EditSessionProvider
              canEdit={editor.canEdit}
              editorName={editor.editorName}
            >
              <ToastProvider>
                <UnlockProvider>
                  <OutboxProvider>
                    <CacheFallbackProvider>
                      <QuickExpenseProvider>
                        <AppUpdateProvider>
                          <HapticProvider />
                          {children}
                          <SyncBadge />
                          <BottomNav />
                        </AppUpdateProvider>
                      </QuickExpenseProvider>
                    </CacheFallbackProvider>
                  </OutboxProvider>
                </UnlockProvider>
              </ToastProvider>
            </EditSessionProvider>
          </I18nProvider>
        </SerwistProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
