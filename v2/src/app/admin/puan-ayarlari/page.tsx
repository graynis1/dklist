import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getPointSettings } from "@/db/queries/points";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { PointSettingsForm } from "@/components/dklist/point-settings-form";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminPointSettingsPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-16" />}>
        <AdminPointSettingsContent />
      </Suspense>
    </div>
  );
}

async function AdminPointSettingsContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const settings = await getPointSettings();

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <AdminPageHeader
        title="Puan Ayarları"
        description="Puan/oyunlaştırma sisteminin kazanç değerlerini ve spam korumasını buradan yönet."
      />
      <PointSettingsForm settings={settings} />
    </div>
  );
}
