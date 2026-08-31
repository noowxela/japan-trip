import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
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
  themeColor: "#b42318",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-hidden bg-[#f6f1e8] font-sans text-stone-900">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
