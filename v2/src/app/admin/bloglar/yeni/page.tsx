import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { createBlogAction } from "@/actions/blog";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BLOG_AUTHOR_ROLES = [USER_TYPES.Blogger, USER_TYPES.Mod, USER_TYPES.Admin];

/**
 * The maintainer's blunt "admin panelden blog girişi yapılamıyor" - the real
 * gap wasn't createBlogAction() itself (Admin was already in
 * BLOG_AUTHOR_ROLES and /blog/yeni worked), it's that the admin panel's own
 * moderation queue (/admin/bloglar) had zero create entry point - an Admin
 * managing the site from inside /admin had to know to leave the panel
 * entirely for the public /blog/yeni composer (public SiteHeader, no admin
 * chrome). This gives the panel its own authoring page, reusing the same
 * server action so both stay in sync with zero duplicated business logic.
 */
export default function AdminNewBlogPage({ searchParams }: PageProps<"/admin/bloglar/yeni">) {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminNewBlogContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminNewBlogContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/bloglar/yeni">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, BLOG_AUTHOR_ROLES)) redirect("/admin/bloglar");

  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <AdminPageHeader title="Yeni Yazı" description="Yönetim panelinden doğrudan blog yazısı ekle." />

      {error && (
        <p className="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Yazı Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBlogAction} className="flex flex-col gap-4">
            <input type="hidden" name="from" value="/admin/bloglar/yeni" />
            <label className="flex flex-col gap-1.5 text-sm">
              Başlık
              <Input name="title" required maxLength={255} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Önizleme
              <textarea
                name="preview"
                required
                rows={2}
                className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-ring"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              İçerik
              <textarea
                name="content"
                required
                rows={12}
                className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-ring"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Kapak Resmi
              <input name="image" type="file" accept="image/*" required className="text-sm" />
            </label>
            <Button type="submit">Yayınla</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
