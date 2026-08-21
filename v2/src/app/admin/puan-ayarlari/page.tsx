import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getPointSettings } from "@/db/queries/points";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { PointSettingsForm } from "@/components/dklist/point-settings-form";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminPointSettingsPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
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
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Puan Ayarları</h1>
        <p className="text-sm text-muted-foreground">
          Puan/oyunlaştırma sisteminin kazanç değerlerini ve spam korumasını buradan yönet.
        </p>
      </div>
      <PointSettingsForm settings={settings} />
    </div>
  );
}
