import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { SiteFeedList } from "@/components/dklist/site-feed";
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

export default function FeedPage({ searchParams }: PageProps<"/akis">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-8 flex flex-col gap-2">
          <SectionLabel>Topluluk</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">Akış</h1>
          <p className="text-muted-foreground">
            DKList topluluğunda son yaşanan okuma, puanlama, yorum ve daha fazlası.
          </p>
        </div>
        <Suspense fallback={<FeedSkeleton />}>
          <FeedContent searchParams={searchParams} />
        </Suspense>
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
      <SiteFeedList initialItems={page.items} initialCursor={page.nextCursor} followingOnly={followingOnly} />
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
