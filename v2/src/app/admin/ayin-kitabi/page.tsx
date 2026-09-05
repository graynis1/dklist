import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getCurrentBookOfMonth, getPastBooksOfMonth } from "@/db/queries/book-of-month";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { SetBookOfMonthForm } from "@/components/dklist/set-book-of-month-form";
import { DeleteBookOfMonthButton } from "@/components/dklist/delete-book-of-month-button";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminBookOfMonthPage() {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminBookOfMonthContent />
      </Suspense>
    </div>
  );
}

async function AdminBookOfMonthContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const [current, past] = await Promise.all([getCurrentBookOfMonth(), getPastBooksOfMonth()]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <AdminPageHeader
        title="Ayın Kitabı"
        description="Topluluk okuma etkinliği için ayın kitabını belirle - yeni bir kitap seçmek öncekini otomatik olarak geçmişe taşır."
      />

      <SetBookOfMonthForm />

      {current && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div>
            <p className="text-xs font-medium text-primary">ŞU AN AKTİF</p>
            <p className="font-medium">
              {current.periodLabel}: <Link href={`/kitap/${current.bookSlug}`} className="hover:underline">{current.bookName}</Link>
            </p>
            <p className="text-xs text-muted-foreground">{current.participantCount} katılımcı</p>
          </div>
          <DeleteBookOfMonthButton id={current.id} />
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="mb-3 font-heading text-lg font-medium">Geçmiş</h2>
          <ul className="flex flex-col gap-2">
            {past.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 text-sm">
                <span>
                  {p.periodLabel}: <Link href={`/kitap/${p.bookSlug}`} className="hover:underline">{p.bookName}</Link>{" "}
                  <span className="text-muted-foreground">· {p.participantCount} katılımcı</span>
                </span>
                <DeleteBookOfMonthButton id={p.id} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
