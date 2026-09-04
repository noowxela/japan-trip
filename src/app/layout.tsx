import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { EditSessionProvider } from "@/components/edit-session";
import { ToastProvider } from "@/components/toast-provider";
import { getEditorSession } from "@/lib/edit-session";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Japan Trip",
  description: "Itinerary companion synced with Notion",
  applicationName: "Japan Trip",
  appleWebApp: {
    capable: true,
    title: "Japan Trip",
    statusBarStyle: "default",
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
            {children}
            <BottomNav />
          </ToastProvider>
        </EditSessionProvider>
      </body>
    </html>
  );
}
