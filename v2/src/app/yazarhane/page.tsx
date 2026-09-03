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
import { auth } from "@/auth";
import { USER_TYPES } from "@/lib/roles";
import { SiteHeader } from "@/components/dklist/site-header";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { CommunitySidebarNav } from "@/components/dklist/community-sidebar-nav";
import { CommunityRightRail } from "@/components/dklist/community-right-rail";
import { WriterApplicationForm } from "@/components/dklist/writer-application-form";
import { formatRelativeTime } from "@/lib/utils";
import { getAuthorMembers, getRecentAuthorPosts, getMyWriterApplication } from "@/db/queries/yazarhane";
import { getUserDecorations, decorationFor } from "@/db/queries/user-decorations";

export default function YazarhanePage() {
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
              <h1 className="font-heading text-2xl font-medium tracking-tight">Yazarhane</h1>
              <p className="text-sm text-muted-foreground">
                DKList&apos;te üye olan gerçek yazarların paylaşımları ve profilleri.
              </p>
            </div>
            <Suspense fallback={<YazarhaneSkeleton />}>
              <YazarhaneContent />
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
  const session = await auth();
  const userType = session?.user?.userType;
  const authorLikeRoles: string[] = [USER_TYPES.Yazar, USER_TYPES.Mod, USER_TYPES.Admin, USER_TYPES.Kurucu, USER_TYPES.SuperAdmin];
  const isAlreadyAuthor = userType ? authorLikeRoles.includes(userType) : false;

  const [members, posts, myApplication] = await Promise.all([
    getAuthorMembers(),
    getRecentAuthorPosts(20),
    session?.user?.id && !isAlreadyAuthor ? getMyWriterApplication(Number(session.user.id)) : Promise.resolve(null),
  ]);
  const decorations = await getUserDecorations([...members.map((m) => m.userId), ...posts.map((p) => p.userId)]);

  return (
    <div className="flex flex-col gap-8">
      {session?.user?.id && !isAlreadyAuthor && (
        <WriterApplicationForm existingApplication={myApplication} />
      )}

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
                <EntityAvatar
                  id={m.userId}
                  name={m.username}
                  image={m.image}
                  size="size-14"
                  profileFrame={decorationFor(decorations, m.userId).profileFrame}
                  frameTier={decorationFor(decorations, m.userId).frameTier}
                  highestBadge={decorationFor(decorations, m.userId).highestBadge}
                />
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
                  <EntityAvatar
                    id={p.userId}
                    name={p.username}
                    image={p.image}
                    size="size-9"
                    profileFrame={decorationFor(decorations, p.userId).profileFrame}
                    frameTier={decorationFor(decorations, p.userId).frameTier}
                    highestBadge={decorationFor(decorations, p.userId).highestBadge}
                  />
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
