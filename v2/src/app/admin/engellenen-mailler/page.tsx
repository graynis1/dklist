import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getBannedEmails } from "@/db/queries/user-delete";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { BannedEmailRow } from "@/components/dklist/banned-email-row";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminBannedEmailsPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-2xl px-6 py-16" />}>
        <AdminBannedEmailsContent />
      </Suspense>
    </div>
  );
}

async function AdminBannedEmailsContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const items = await getBannedEmails();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <AdminPageHeader
        title="Engellenen E-postalar"
        description="Bu e-posta adresleriyle yeniden kayıt oluşturulamaz. Kullanıcılar sayfasındaki E-postayı Engelle ile eklenir."
      />
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz engellenen bir e-posta yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <BannedEmailRow key={item.email} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
