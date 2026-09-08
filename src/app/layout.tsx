import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppUpdateProvider } from "@/components/app-update-provider";
import { BottomNav } from "@/components/bottom-nav";
import { EditSessionProvider } from "@/components/edit-session";
import { HapticProvider } from "@/components/haptic-provider";
import { ToastProvider } from "@/components/toast-provider";
import { getEditorSession } from "@/lib/edit-session";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const siteTitle = "Japan Trip";
const siteDescription = "Itinerary companion synced with Notion";

export const metadata: Metadata = {
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
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f1e8",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const editor = await getEditorSession();

  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full overflow-x-hidden bg-paper font-sans text-stone-900">
        <EditSessionProvider
          canEdit={editor.canEdit}
          editorName={editor.editorName}
        >
          <ToastProvider>
            <AppUpdateProvider>
              <HapticProvider />
              {children}
              <BottomNav />
            </AppUpdateProvider>
          </ToastProvider>
        </EditSessionProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
