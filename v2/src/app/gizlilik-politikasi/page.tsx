import type { Metadata } from "next";
import { LegalPage } from "@/components/dklist/legal-page";
import { PRIVACY_POLICY_TITLE, PRIVACY_POLICY_INTRO, PRIVACY_POLICY } from "@/lib/legal-content";
import { pageMetadata, truncateDescription } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: PRIVACY_POLICY_TITLE,
  description: truncateDescription(PRIVACY_POLICY_INTRO.join(" ")),
  path: "/gizlilik-politikasi",
});

export default function PrivacyPolicyPage() {
  return <LegalPage title={PRIVACY_POLICY_TITLE} intro={PRIVACY_POLICY_INTRO} sections={PRIVACY_POLICY} />;
}
