import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getRewardAdminList } from "@/db/queries/point-store";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { CreateRewardForm } from "@/components/dklist/create-reward-form";
import { RewardAdminRow } from "@/components/dklist/reward-admin-row";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminPointStorePage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminPointStoreContent />
      </Suspense>
    </div>
  );
}

async function AdminPointStoreContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const rewards = await getRewardAdminList();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Puan Mağazası</h1>
        <p className="text-sm text-muted-foreground">
          Kullanıcıların puanlarını harcayarak alabileceği profil çerçevelerini yönet - toplam {rewards.length} ödül.
        </p>
      </div>

      <CreateRewardForm />

      {rewards.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz ödül yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rewards.map((r) => (
            <RewardAdminRow key={r.id} reward={r} />
          ))}
        </ul>
      )}
    </div>
  );
}
