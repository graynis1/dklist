import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getPremiumSettings } from "@/db/queries/premium";
import { SiteHeader } from "@/components/dklist/site-header";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { PremiumSettingsForm } from "@/components/dklist/premium-settings-form";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminPremiumSettingsPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-16" />}>
        <AdminPremiumSettingsContent />
      </Suspense>
    </div>
  );
}

async function AdminPremiumSettingsContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const settings = await getPremiumSettings();

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <AdminPageHeader title="Premium Üyelik Ayarları" />
      <PremiumSettingsForm settings={settings} />
    </div>
  );
}
