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
import { getUserDecorations, decorationFor } from "@/db/queries/user-decorations";

const BLOG_AUTHOR_ROLES = [USER_TYPES.Blogger, USER_TYPES.Mod, USER_TYPES.Admin];

/** Shared cover-or-branded-placeholder treatment for both the hero card and
 * the regular grid cards - one place for the "DK" fallback instead of
 * repeating the same markup at both call sites. */
function BlogCover({ img, className, iconClassName }: { img: string | null; className?: string; iconClassName?: string }) {
  const placeholder = (
    <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-accent">
      <span className={`font-heading text-muted-foreground/40 ${iconClassName ?? "text-2xl"}`}>DK</span>
    </div>
  );
  if (!img) return placeholder;
  return <ImageWithFallback src={img} alt="" className={`size-full object-cover ${className ?? ""}`} fallback={placeholder} />;
}

export const metadata = {
  alternates: {
    types: { "application/rss+xml": "/rss.xml" },
  },
};

export default function BlogListPage({ searchParams }: PageProps<"/bloglar">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-[100rem] px-4 py-10 sm:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_320px]">
          <aside className="hidden min-w-0 lg:sticky lg:top-20 lg:block lg:h-fit">
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

          <aside className="hidden min-w-0 xl:sticky xl:top-20 xl:block xl:h-fit">
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
  // News-site "front page" shape only applies to the real front page - a
  // hero treatment on a search-results page or page 2 would be misleading
  // (there's nothing genuinely "featured" about whatever happens to sort
  // first there).
  const showHero = page === 1 && !search && items.length > 0;
  const [hero, ...rest] = showHero ? items : [null, ...items];
  const decorations = await getUserDecorations(items.map((i) => i.ownerId).filter((id): id is number => id != null));

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
          {hero && (
            <Link
              href={`/blog/${hero.slug}`}
              className="group mb-8 grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-foreground/15 md:grid-cols-[1.3fr_1fr]"
            >
              <div className="aspect-[16/9] w-full overflow-hidden bg-muted md:aspect-auto md:h-full">
                <BlogCover img={hero.img} className="transition-transform duration-300 group-hover:scale-105" iconClassName="text-4xl" />
              </div>
              <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
                <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
                  Öne Çıkan
                </span>
                <h2 className="font-heading text-2xl leading-tight font-medium tracking-tight group-hover:text-primary sm:text-3xl">
                  {hero.title}
                </h2>
                <p className="line-clamp-3 text-[0.95rem] leading-relaxed text-muted-foreground">{hero.preview}</p>
                <div className="mt-1 flex items-center gap-2">
                  {hero.ownerUsername && hero.ownerId != null && (
                    <EntityAvatar
                      id={hero.ownerId}
                      name={hero.ownerUsername}
                      image={hero.ownerImage}
                      size="size-7"
                      profileFrame={decorationFor(decorations, hero.ownerId).profileFrame}
                      frameTier={decorationFor(decorations, hero.ownerId).frameTier}
                      highestBadge={decorationFor(decorations, hero.ownerId).highestBadge}
                    />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {hero.ownerUsername ? `@${hero.ownerUsername} · ` : ""}
                    {hero.createdDate}
                  </span>
                </div>
              </div>
            </Link>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {rest.map((post) => (
              <Link
                key={post!.id}
                href={`/blog/${post!.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/15"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                  <BlogCover img={post!.img} className="transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h2 className="font-heading text-lg leading-tight font-medium tracking-tight group-hover:text-primary">
                    {post!.title}
                  </h2>
                  <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">{post!.preview}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {post!.ownerUsername && post!.ownerId != null && (
                      <EntityAvatar
                        id={post!.ownerId}
                        name={post!.ownerUsername}
                        image={post!.ownerImage}
                        size="size-6"
                        profileFrame={decorationFor(decorations, post!.ownerId).profileFrame}
                        frameTier={decorationFor(decorations, post!.ownerId).frameTier}
                        highestBadge={decorationFor(decorations, post!.ownerId).highestBadge}
                      />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {post!.ownerUsername ? `@${post!.ownerUsername} · ` : ""}
                      {post!.createdDate}
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
