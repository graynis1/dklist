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
import { getUserDecorations, decorationFor } from "@/db/queries/user-decorations";
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
      <div className="mx-auto max-w-[100rem] px-4 py-10 sm:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_320px]">
          <aside className="hidden min-w-0 lg:sticky lg:top-20 lg:block lg:h-fit">
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
  // Reversed 2026-09-09, customer's explicit correction: "etkinlikler
  // normal akış sayfasında da göster" (show activity events on the main
  // feed too) - an earlier session had split posts/activity into separate
  // tabs on the maintainer's own request; the customer now wants them
  // merged on the default tab. "Okuma Etkinliği" stays as a pure filter
  // for anyone who wants ONLY the passive-activity events.
  const view = params.view === "activity" ? "activity" : "posts";

  const session = await auth();
  const viewerId = session?.user?.id ? Number(session.user.id) : null;
  const followingOnly = scope === "following";

  const page = await getSiteFeed({ followingOnly, viewerId, mode: view === "activity" ? "activity" : "all" });
  const viewerDecoration = viewerId ? decorationFor(await getUserDecorations([viewerId]), viewerId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      {viewerId && session?.user && view === "posts" && (
        <FeedComposer
          userId={viewerId}
          username={session.user.name ?? "?"}
          userImage={session.user.image ?? null}
          profileFrame={viewerDecoration?.profileFrame}
          frameTier={viewerDecoration?.frameTier}
          highestBadge={viewerDecoration?.highestBadge}
        />
      )}
      <div className="flex w-fit flex-wrap gap-1 rounded-full bg-muted p-1 text-sm">
        <TabLink href="/akis" active={view === "posts" && scope === "everyone"}>
          Tümü
        </TabLink>
        {viewerId && (
          <TabLink href="/akis?scope=following" active={view === "posts" && scope === "following"}>
            Takip Ettiklerim
          </TabLink>
        )}
        <TabLink href="/akis?view=activity" active={view === "activity"}>
          Sadece Okuma Etkinliği
        </TabLink>
      </div>
      <Suspense fallback={null}>
        <AdSlot placement="akis" className="max-w-none px-0" />
      </Suspense>
      {/* Real bug found via customer report (2026-09-10): "bir diğerini
          seçince sayfayı güncellemiyor, sadece yenile dersem doğru verileri
          getiriyor" (switching tabs doesn't update, only a hard refresh
          does) - SiteFeedList seeds its list via useState(initialItems),
          which React only reads on first mount. A tab switch is a soft
          navigation to the same component instance with new props, so the
          stale list stuck around silently. A key that changes with the
          tab forces React to remount (and re-seed state) on every switch. */}
      <SiteFeedList
        key={`${view}-${scope}`}
        initialItems={page.items}
        initialCursor={page.nextCursor}
        followingOnly={followingOnly}
        signedIn={Boolean(viewerId)}
        viewerId={viewerId}
        mode={view}
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
