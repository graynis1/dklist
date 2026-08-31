import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getPendingWriterApplications } from "@/db/queries/yazarhane";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { WriterApplicationRow } from "@/components/dklist/writer-application-row";

const REVIEW_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

export default function AdminWriterApplicationsPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminWriterApplicationsContent />
      </Suspense>
    </div>
  );
}

async function AdminWriterApplicationsContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, REVIEW_ROLES)) redirect("/");

  const items = await getPendingWriterApplications();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader
        title="Yazarhane Başvuruları"
        description={`İnceleme bekleyen Yazarhane başvuruları - toplam ${items.length} kayıt.`}
      />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bekleyen başvuru yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <WriterApplicationRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
