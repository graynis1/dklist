import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getPendingVerificationRequests } from "@/db/queries/identity-verification";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { VerificationRequestRow } from "@/components/dklist/verification-request-row";

const REVIEW_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

export default function AdminVerificationPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminVerificationContent />
      </Suspense>
    </div>
  );
}

async function AdminVerificationContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, REVIEW_ROLES)) redirect("/");

  const items = await getPendingVerificationRequests();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader
        title="Doğrulanmış Okur Başvuruları"
        description={`İnceleme bekleyen kimlik doğrulama başvuruları - toplam ${items.length} kayıt.`}
      />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bekleyen başvuru yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <VerificationRequestRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
