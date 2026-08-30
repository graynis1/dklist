import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Yazarhane",
  description: "Gerçek yazarlardan gönderiler - Yazarhane, DKList'teki yazarların kendi köşesi.",
  path: "/yazarhane",
});
import { connection } from "next/server";
import Link from "next/link";
import { PenLineIcon } from "lucide-react";
import { SiteHeader } from "@/components/dklist/site-header";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { CommunitySidebarNav } from "@/components/dklist/community-sidebar-nav";
import { CommunityRightRail } from "@/components/dklist/community-right-rail";
import { formatRelativeTime } from "@/lib/utils";
import { getAuthorMembers, getRecentAuthorPosts } from "@/db/queries/yazarhane";

export default function YazarhanePage() {
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
            <div className="mb-6 flex flex-col gap-1">
              <h1 className="font-heading text-2xl font-medium tracking-tight">Yazarhane</h1>
              <p className="text-sm text-muted-foreground">
                DKList&apos;te üye olan gerçek yazarların paylaşımları ve profilleri.
              </p>
            </div>
            <Suspense fallback={<YazarhaneSkeleton />}>
              <YazarhaneContent />
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

function YazarhaneSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

async function YazarhaneContent() {
  await connection();
  const [members, posts] = await Promise.all([getAuthorMembers(), getRecentAuthorPosts(20)]);

  return (
    <div className="flex flex-col gap-8">
      {members.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Yazarlar</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {members.map((m) => (
              <Link
                key={m.userId}
                href={`/yazarhane/${m.username}`}
                className="flex w-40 shrink-0 flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-foreground/15"
              >
                <EntityAvatar id={m.userId} name={m.username} image={m.image} size="size-14" />
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-sm font-medium">@{m.username}</p>
                  {m.writerName && <p className="truncate text-xs text-muted-foreground">{m.writerName}</p>}
                  <p className="text-xs text-muted-foreground">{m.postCount} paylaşım</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Son Paylaşımlar</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz paylaşım yok.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((p) => (
              <article key={p.id} className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/15 sm:p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <EntityAvatar id={p.userId} name={p.username} image={p.image} size="size-9" />
                  <div className="flex min-w-0 flex-col">
                    <Link href={`/yazarhane/${p.username}`} className="text-sm font-medium hover:underline">
                      @{p.username}
                    </Link>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                      <PenLineIcon className="size-3" />
                      {formatRelativeTime(p.createdDate)}
                    </span>
                  </div>
                </div>
                <p className="mb-1.5 font-heading text-lg font-medium tracking-tight">{p.title}</p>
                <p className="line-clamp-6 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{p.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
