import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getBookAdminDetail } from "@/db/queries/book-admin";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { BookAdminEditForm } from "@/components/dklist/book-admin-edit-form";

const ADMIN_ONLY = [USER_TYPES.Admin];

export default function AdminBookEditPage({ params }: PageProps<"/admin/kitaplar/[id]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-2xl px-6 py-16" />}>
        <AdminBookEditContent params={params} />
      </Suspense>
    </div>
  );
}

async function AdminBookEditContent({ params }: { params: PageProps<"/admin/kitaplar/[id]">["params"] }) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, ADMIN_ONLY)) redirect("/");

  const { id } = await params;
  const book = await getBookAdminDetail(Number(id));
  if (!book) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">{book.name}</h1>
      </div>
      <BookAdminEditForm book={book} />
    </div>
  );
}
