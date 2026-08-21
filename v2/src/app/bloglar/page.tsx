import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getBlogList } from "@/db/queries/blog";

const BLOG_AUTHOR_ROLES = [USER_TYPES.Blogger, USER_TYPES.Mod, USER_TYPES.Admin];

export default function BlogListPage({ searchParams }: PageProps<"/bloglar">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-2">
            <SectionLabel>Topluluk</SectionLabel>
            <h1 className="font-heading text-3xl font-medium tracking-tight">Bloglar</h1>
          </div>
          <Suspense fallback={null}>
            <NewPostLink />
          </Suspense>
        </div>
        <Suspense fallback={<BlogListSkeleton />}>
          <BlogList searchParams={searchParams} />
        </Suspense>
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
    <div className="flex flex-col gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
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
      <form action="/bloglar" className="mb-8 flex gap-2">
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
          <ul className="flex flex-col gap-6">
            {items.map((post) => (
              <li key={post.id} className="border-b border-border pb-6">
                <Link href={`/blog/${post.slug}`} className="flex flex-col gap-1">
                  <h2 className="font-heading text-xl font-medium tracking-tight hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {post.ownerUsername ? `@${post.ownerUsername} · ` : ""}
                    {post.createdDate}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    {post.preview}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

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
      {total > 0 && <p className="mt-2 text-xs text-muted-foreground">Toplam {total} yazı.</p>}
    </div>
  );
}
