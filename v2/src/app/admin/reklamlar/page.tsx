import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getAdAdminList } from "@/db/queries/advertisements";
import { getAdSenseSettings, getAdSensePlacements } from "@/db/queries/adsense";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { CreateAdForm } from "@/components/dklist/create-ad-form";
import { AdAdminRow } from "@/components/dklist/ad-admin-row";
import { AdSenseSettingsForm } from "@/components/dklist/adsense-settings-form";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminAdsPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminAdsContent />
      </Suspense>
    </div>
  );
}

async function AdminAdsContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const [ads, adsenseSettings, adsensePlacements] = await Promise.all([
    getAdAdminList(),
    getAdSenseSettings(),
    getAdSensePlacements(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader
        title="Reklamlar"
        description={`Premium olmayan kullanıcılara gösterilen reklam alanlarını yönet - toplam ${ads.length} kayıt.`}
      />

      <AdSenseSettingsForm initialSettings={adsenseSettings} initialPlacements={adsensePlacements} />

      <CreateAdForm />

      {ads.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz reklam yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {ads.map((ad) => (
            <AdAdminRow key={ad.id} ad={ad} />
          ))}
        </ul>
      )}
    </div>
  );
}
