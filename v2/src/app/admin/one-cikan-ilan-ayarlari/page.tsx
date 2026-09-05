import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getStorePinSettings } from "@/db/queries/store-pin";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { StorePinSettingsForm } from "@/components/dklist/store-pin-settings-form";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminStorePinSettingsPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-16" />}>
        <AdminStorePinSettingsContent />
      </Suspense>
    </div>
  );
}

async function AdminStorePinSettingsContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const settings = await getStorePinSettings();

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <AdminPageHeader title="İlan Öne Çıkarma Ayarları" />
      <StorePinSettingsForm settings={settings} />
    </div>
  );
}
