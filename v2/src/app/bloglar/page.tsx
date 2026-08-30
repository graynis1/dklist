import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { SiteHeader } from "@/components/dklist/site-header";
import { CommunitySidebarNav } from "@/components/dklist/community-sidebar-nav";
import { CommunityRightRail } from "@/components/dklist/community-right-rail";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { ImageWithFallback } from "@/components/dklist/image-with-fallback";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getBlogList } from "@/db/queries/blog";

const BLOG_AUTHOR_ROLES = [USER_TYPES.Blogger, USER_TYPES.Mod, USER_TYPES.Admin];

export const metadata = {
  alternates: {
    types: { "application/rss+xml": "/rss.xml" },
  },
};

export default function BlogListPage({ searchParams }: PageProps<"/bloglar">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_300px]">
          <aside className="hidden lg:sticky lg:top-20 lg:block lg:h-fit">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
              <CommunitySidebarNav />
            </Suspense>
          </aside>

          <main className="min-w-0">
            <div className="mb-6 flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <h1 className="font-heading text-2xl font-medium tracking-tight">Bloglar</h1>
                <p className="text-sm text-muted-foreground">DKList topluluğundan yazılar.</p>
              </div>
              <div className="flex items-center gap-3">
                <a href="/rss.xml" className="text-sm text-muted-foreground underline hover:text-foreground">
                  RSS
                </a>
                <Suspense fallback={null}>
                  <NewPostLink />
                </Suspense>
              </div>
            </div>
            <Suspense fallback={<BlogListSkeleton />}>
              <BlogList searchParams={searchParams} />
            </Suspense>
          </main>

          <aside className="hidden xl:sticky xl:top-20 xl:block xl:h-fit">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
              <CommunityRightRail />
            </Suspense>
          </aside>
        </div>
      </div>
    </div>
  );
}

async function NewPostLink() {
  const session = await auth();
  if (!hasRole(session?.user?.userType, BLOG_AUTHOR_ROLES)) return null;
  return (
    <Link href="/blog/yeni" className="text-sm underline hover:text-foreground">
      Yeni Yazı
    </Link>
  );
}

function BlogListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

async function BlogList({
  searchParams,
}: {
  searchParams: PageProps<"/bloglar">["searchParams"];
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const search = typeof params.search === "string" ? params.search : "";

  const { items, total, lastPage } = await getBlogList(page, 10, search);

  return (
    <div>
      <form action="/bloglar" className="mb-6 flex gap-2">
        <Input name="search" defaultValue={search} placeholder="Blog yazılarında ara..." />
        <Button type="submit" variant="outline">
          Ara
        </Button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted-foreground">
          {search ? "Bu aramaya uyan blog yazısı yok." : "Henüz blog yazısı yok."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {items.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/15"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                  {post.img ? (
                    <ImageWithFallback
                      src={post.img}
                      alt=""
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      fallback={
                        <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-accent">
                          <span className="font-heading text-2xl text-muted-foreground/40">DK</span>
                        </div>
                      }
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-accent">
                      <span className="font-heading text-2xl text-muted-foreground/40">DK</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="font-heading text-lg leading-tight font-medium tracking-tight group-hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">{post.preview}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {post.ownerUsername && post.ownerId != null && (
                      <EntityAvatar id={post.ownerId} name={post.ownerUsername} size="size-6" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {post.ownerUsername ? `@${post.ownerUsername} · ` : ""}
                      {post.createdDate}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {lastPage > 1 && (
            <div className="mt-8 flex justify-center gap-2 text-sm">
              {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/bloglar?page=${p}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                  className={`rounded-md px-2.5 py-1 ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
      {total > 0 && <p className="mt-4 text-xs text-muted-foreground">Toplam {total} yazı.</p>}
    </div>
  );
}
