import { Suspense } from "react";
import type { Metadata } from "next";
import { NOINDEX_METADATA } from "@/lib/seo";

export const metadata: Metadata = NOINDEX_METADATA;
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { createBlogAction } from "@/actions/blog";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BLOG_AUTHOR_ROLES = [USER_TYPES.Blogger, USER_TYPES.Mod, USER_TYPES.Admin];

export default function NewBlogPage({ searchParams }: PageProps<"/blog/yeni">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-16" />}>
        <NewBlogContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewBlogContent({
  searchParams,
}: {
  searchParams: PageProps<"/blog/yeni">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, BLOG_AUTHOR_ROLES)) redirect("/bloglar");

  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Blog</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Yeni Yazı</h1>
      </div>

      {error && (
        <p className="mb-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Yazı Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBlogAction} className="flex flex-col gap-4">
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
                rows={10}
                className="w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-ring"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              Kapak Resmi
              <input name="image" type="file" accept=".png,.jpg,.jpeg,.webp" required className="text-sm" />
            </label>
            <Button type="submit">Yayınla</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
