import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { PublicChrome } from "@/components/dklist/public-chrome";
import { SiteFooter } from "@/components/dklist/site-footer";
import { MobileBottomNav } from "@/components/dklist/mobile-bottom-nav";
import { FloatingChatWidget } from "@/components/dklist/floating-chat-widget";
import { SitePopupModal } from "@/components/dklist/site-popup-modal";
import { DailyVisitTracker } from "@/components/dklist/daily-visit-tracker";
import { PwaRegister } from "@/components/dklist/pwa-register";
import { RealtimeRefresherGate } from "@/components/dklist/realtime-refresher-gate";
import { SkyscraperAds } from "@/components/dklist/skyscraper-ads";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial display serif for headings/branding - deliberately distinct from v1's
// antd default (system-ui everywhere) to give DKList its own visual identity.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const SITE_NAME = "DKList";
const SITE_DESCRIPTION =
  "DKList - Kitap severlerin buluştuğu adres. Kitap keşfet, okuma durumunu takip et, puanla, yorum yap, kitap kulüplerine katıl.";

export const metadata: Metadata = {
  metadataBase: new URL("https://dklist.com"),
  title: {
    default: `${SITE_NAME} - Kitap Severlerin Buluştuğu Adres`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["kitap", "kitap okuma", "kitap kulübü", "kitap yorumu", "kitap tavsiyesi", "okuma listesi", "dklist"],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Kitap Severlerin Buluştuğu Adres`,
    description: SITE_DESCRIPTION,
    // Real bug found via customer report: sharing the bare dklist.com
    // domain showed no image at all in link previews - no og:image was
    // ever set here. metadataBase above resolves this relative path to
    // an absolute URL automatically.
    images: [{ url: "/manifest-icon-512.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Kitap Severlerin Buluştuğu Adres`,
    description: SITE_DESCRIPTION,
    images: ["/manifest-icon-512.png"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col pb-14 md:pb-0">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Suspense fallback={null}>
            <PublicChrome>
              <SiteFooter />
              <MobileBottomNav />
              <FloatingChatWidget />
              <SitePopupModal />
              <SkyscraperAds />
            </PublicChrome>
          </Suspense>
          <DailyVisitTracker />
          <PwaRegister />
          <RealtimeRefresherGate />
        </ThemeProvider>
      </body>
    </html>
  );
}
