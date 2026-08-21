import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteFooter } from "@/components/dklist/site-footer";
import { MobileBottomNav } from "@/components/dklist/mobile-bottom-nav";
import { SitePopupModal } from "@/components/dklist/site-popup-modal";
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

export const metadata: Metadata = {
  title: "DKList",
  description: "DK List - Kitap Severlerin Buluştuğu Adres",
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
          <SiteFooter />
          <MobileBottomNav />
          <SitePopupModal />
        </ThemeProvider>
      </body>
    </html>
  );
}
