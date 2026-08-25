import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { SendDigestButton } from "@/components/dklist/send-digest-button";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminWeeklyDigestPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-16" />}>
        <AdminWeeklyDigestContent />
      </Suspense>
    </div>
  );
}

async function AdminWeeklyDigestContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <AdminPageHeader
        title="Haftalık E-posta Özeti"
        description={
          <>
            Her kullanıcıya bu haftaki puan/sıralama, okunmamış bildirim sayısı ve ayın kitabını içeren bir özet e-postası gönder. Raporlanacak hiçbir şeyi olmayan kullanıcılar atlanır. Gerçek üretimde bu, bir VPS crontab&apos;ının <code>/api/cron/weekly-digest</code> uç noktasını haftalık tetiklemesiyle otomatik çalışır - bu buton manuel/test amaçlıdır.
          </>
        }
      />
      <SendDigestButton />
    </div>
  );
}
