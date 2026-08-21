import { LegalPage } from "@/components/dklist/legal-page";
import { PRIVACY_POLICY_TITLE, PRIVACY_POLICY_INTRO, PRIVACY_POLICY } from "@/lib/legal-content";

export default function PrivacyPolicyPage() {
  return <LegalPage title={PRIVACY_POLICY_TITLE} intro={PRIVACY_POLICY_INTRO} sections={PRIVACY_POLICY} />;
}
