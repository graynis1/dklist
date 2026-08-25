import type { Metadata } from "next";
import { LegalPage } from "@/components/dklist/legal-page";
import { COOKIE_POLICY_TITLE, COOKIE_POLICY_INTRO, COOKIE_POLICY } from "@/lib/legal-content";
import { pageMetadata, truncateDescription } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: COOKIE_POLICY_TITLE,
  description: truncateDescription(COOKIE_POLICY_INTRO.join(" ")),
  path: "/cerez-politikasi",
});

export default function CookiePolicyPage() {
  return <LegalPage title={COOKIE_POLICY_TITLE} intro={COOKIE_POLICY_INTRO} sections={COOKIE_POLICY} />;
}
