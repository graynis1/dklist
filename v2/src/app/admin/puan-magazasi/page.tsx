import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getRewardAdminList } from "@/db/queries/point-store";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { CreateRewardForm } from "@/components/dklist/create-reward-form";
import { RewardAdminRow } from "@/components/dklist/reward-admin-row";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminPointStorePage() {
  return (
    <div className="flex-1 bg-background">
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
      <AdminPageHeader
        title="Puan Mağazası"
        description={`Kullanıcıların puanlarını harcayarak alabileceği profil çerçevelerini yönet - toplam ${rewards.length} ödül.`}
      />

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
