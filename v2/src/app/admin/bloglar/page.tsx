import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { getAdminBlogList } from "@/db/queries/blog";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { BlogModerationActions } from "@/components/dklist/blog-moderation-actions";

// v1's getAll() lets Admin OR Mod view the moderation table, but
// setApproveBlog() only ever let Admin actually approve/reject - a real
// asymmetry in v1 (a Mod can see the queue but not resolve it), matched
// as-is rather than "fixed".
const VIEW_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

export default function AdminBlogPage() {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AdminBlogContent />
      </Suspense>
    </div>
  );
}

async function AdminBlogContent() {
  const session = await auth();
  if (!session?.user) redirect("/giris");
  if (!hasRole(session.user.userType, VIEW_ROLES)) redirect("/");

  const items = await getAdminBlogList();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-2">
        <SectionLabel>Yönetim</SectionLabel>
        <h1 className="font-heading text-3xl font-medium tracking-tight">Blog Moderasyonu</h1>
        <p className="text-sm text-muted-foreground">
          Onay bekleyen ve yayındaki tüm yazılar - toplam {items.length} kayıt.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Henüz blog yazısı yok.</p>
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
    </div>
  );
}
