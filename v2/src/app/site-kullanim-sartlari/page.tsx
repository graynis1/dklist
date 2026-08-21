import { LegalPage } from "@/components/dklist/legal-page";
import { SITE_TERMS_TITLE, SITE_TERMS } from "@/lib/legal-content";

export default function SiteTermsPage() {
  return <LegalPage title={SITE_TERMS_TITLE} sections={SITE_TERMS} />;
}
