import type { Metadata } from "next";
import { LegalPage } from "@/components/dklist/legal-page";
import { SITE_TERMS_TITLE, SITE_TERMS } from "@/lib/legal-content";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: SITE_TERMS_TITLE,
  description: "DKList'i kullanırken geçerli olan kullanım şartları.",
  path: "/site-kullanim-sartlari",
});

export default function SiteTermsPage() {
  return <LegalPage title={SITE_TERMS_TITLE} sections={SITE_TERMS} />;
}
