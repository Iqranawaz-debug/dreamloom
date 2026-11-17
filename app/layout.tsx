import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Atmosphere } from "@/components/Atmosphere";
import { SiteNav } from "@/components/SiteNav";
import { PwaAgent } from "@/components/PwaAgent";

// next/font self-hosts these at build time: no runtime requests to Google.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Dream Painter", template: "%s · Dream Painter" },
  description: "Tell a dream, receive a painting and a poem. A private dream journal.",
  applicationName: "Dream Painter",
  appleWebApp: { capable: true, title: "Dream Painter", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0c1f",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only-focusable btn btn-secondary btn-sm fixed left-4 top-4 z-50">
          Skip to content
        </a>
        <Atmosphere />
        <SiteNav />
        <main id="main" className="flex flex-1 flex-col pb-24 sm:pb-12">
          {children}
        </main>
        <PwaAgent />
      </body>
    </html>
  );
}
