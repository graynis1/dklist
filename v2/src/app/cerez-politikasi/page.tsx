import { LegalPage } from "@/components/dklist/legal-page";
import { COOKIE_POLICY_TITLE, COOKIE_POLICY_INTRO, COOKIE_POLICY } from "@/lib/legal-content";

export default function CookiePolicyPage() {
  return <LegalPage title={COOKIE_POLICY_TITLE} intro={COOKIE_POLICY_INTRO} sections={COOKIE_POLICY} />;
}
