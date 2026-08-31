import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getAdminBlogList } from "@/db/queries/blog";
import { AdminPageHeader } from "@/components/dklist/admin-page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BlogModerationActions } from "@/components/dklist/blog-moderation-actions";

// v1's getAll() lets Admin OR Mod view the moderation table, but
// setApproveBlog() only ever let Admin actually approve/reject - a real
// asymmetry in v1 (a Mod can see the queue but not resolve it), matched
// as-is rather than "fixed".
const VIEW_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

export default function AdminBlogPage({ searchParams }: PageProps<"/admin/bloglar">) {
  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminBlogContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminBlogContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/bloglar">["searchParams"];
}) {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, VIEW_ROLES)) redirect("/");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, total, lastPage } = await getAdminBlogList(page, 10, search);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-start justify-between gap-4">
        <AdminPageHeader
          title="Blog Moderasyonu"
          description={`Onay bekleyen ve yayındaki tüm yazılar - toplam ${total} kayıt.`}
        />
        <Link href="/admin/bloglar/yeni" className="shrink-0">
          <Button>Yeni Yazı</Button>
        </Link>
      </div>

      <form action="/admin/bloglar" className="mb-6 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Başlık, önizleme veya içerikte ara..." />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "Bu aramaya uyan blog yazısı yok." : "Henüz blog yazısı yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((post) => (
            <li key={post.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
              <div className="flex flex-col gap-1 text-sm">
                <Link href={`/blog/${post.slug}`} className="font-medium hover:underline">
                  {post.title}
                </Link>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>@{post.ownerUsername ?? "?"}</span>
                  {post.approved ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">Yayında</span>
                  ) : (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">Onay bekliyor</span>
                  )}
                  {post.hasPendingRevision && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">Değişiklik onay bekliyor</span>
                  )}
                </div>
              </div>
              <BlogModerationActions blogId={post.id} />
            </li>
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <div className="mt-8 flex justify-center gap-2 text-sm">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/bloglar?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className={`rounded-md px-2.5 py-1 ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
