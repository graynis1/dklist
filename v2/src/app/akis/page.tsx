import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { SiteFeedList } from "@/components/dklist/site-feed";
import { FeedComposer } from "@/components/dklist/feed-composer";
import { CommunitySidebarNav } from "@/components/dklist/community-sidebar-nav";
import { CommunityRightRail } from "@/components/dklist/community-right-rail";
import { AdSlot } from "@/components/dklist/ad-slot";
import { getSiteFeed } from "@/db/queries/feed";
import { auth } from "@/auth";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Akış",
  description: "DKList topluluğunda son yaşanan okuma, puanlama, yorum ve daha fazlası.",
  path: "/akis",
});

/**
 * Three-column Facebook/Reddit-shaped layout - maintainer's explicit ask,
 * screenshots of both included for reference. Left rail is real site
 * navigation (shortcuts to every "topluluk" destination), right rail is
 * real trending/social-proof/leaderboard widgets, center is the feed
 * itself - the same structural shape those platforms use, built from this
 * site's own already-real data rather than inventing anything.
 */
export default function FeedPage({ searchParams }: PageProps<"/akis">) {
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
              <h1 className="font-heading text-2xl font-medium tracking-tight">Akış</h1>
              <p className="text-sm text-muted-foreground">
                DKList topluluğunda son yaşanan okuma, puanlama, yorum ve daha fazlası.
              </p>
            </div>
            <Suspense fallback={<FeedSkeleton />}>
              <FeedContent searchParams={searchParams} />
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

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function FeedContent({ searchParams }: { searchParams: PageProps<"/akis">["searchParams"] }) {
  const params = await searchParams;
  const scope = params.scope === "following" ? "following" : "everyone";

  const session = await auth();
  const viewerId = session?.user?.id ? Number(session.user.id) : null;
  const followingOnly = scope === "following";

  const page = await getSiteFeed({ followingOnly, viewerId });

  return (
    <div className="flex flex-col gap-6">
      {viewerId && session?.user && (
        <FeedComposer userId={viewerId} username={session.user.name ?? "?"} userImage={session.user.image ?? null} />
      )}
      {viewerId && (
        <div className="flex w-fit gap-1 rounded-full bg-muted p-1 text-sm">
          <TabLink href="/akis" active={scope === "everyone"}>
            Herkes
          </TabLink>
          <TabLink href="/akis?scope=following" active={scope === "following"}>
            Takip Ettiklerim
          </TabLink>
        </div>
      )}
      <Suspense fallback={null}>
        <AdSlot placement="akis" className="max-w-none px-0" />
      </Suspense>
      <SiteFeedList
        initialItems={page.items}
        initialCursor={page.nextCursor}
        followingOnly={followingOnly}
        signedIn={Boolean(viewerId)}
        viewerId={viewerId}
      />
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1.5 font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
