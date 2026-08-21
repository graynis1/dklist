import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getAdAdminList } from "@/db/queries/advertisements";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { CreateAdForm } from "@/components/dklist/create-ad-form";
import { AdAdminRow } from "@/components/dklist/ad-admin-row";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminAdsPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
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

  const ads = await getAdAdminList();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Reklamlar</h1>
        <p className="text-sm text-muted-foreground">
          Premium olmayan kullanıcılara gösterilen reklam alanlarını yönet - toplam {ads.length} kayıt.
        </p>
      </div>

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
