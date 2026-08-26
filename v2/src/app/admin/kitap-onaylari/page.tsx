import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getPendingBookSubmissions } from "@/db/queries/book-admin";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { BookSubmissionActions } from "@/components/dklist/book-submission-actions";

// Same "Kütüphaneci"("Mod")/Admin gate as the customer's spec: Kütüphaneci
// can both enter data AND approve additions from Yazar/Yayinevi members.
const VIEW_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

export default function BookApprovalsPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <BookApprovalsContent />
      </Suspense>
    </div>
  );
}

async function BookApprovalsContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, VIEW_ROLES)) redirect("/");

  const submissions = await getPendingBookSubmissions();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader
        title="Kitap Onayları"
        description={`Yazar/yayınevi üyelerinin gönderdiği, onay bekleyen kitaplar - ${submissions.length} kayıt.`}
      />

      {submissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Onay bekleyen kitap yok.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {submissions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {s.orgName} · {s.publisherName}
                  {s.writers.length > 0 && ` · ${s.writers.join(", ")}`}
                </span>
              </div>
              <BookSubmissionActions bookId={s.id} />
            </li>
          ))}
        </ul>
      )}

      <Link href="/kitap/yeni" className="mt-8 block text-sm text-muted-foreground underline">
        Kendi kitap gönderini ekle →
      </Link>
    </div>
  );
}
