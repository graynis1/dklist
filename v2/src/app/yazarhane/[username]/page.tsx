import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata, truncateDescription } from "@/lib/seo";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarUrl } from "@/db/queries/avatar";
import { auth } from "@/auth";
import { getAuthorHubByUsername, getAuthorPosts } from "@/db/queries/yazarhane";
import { getFollowCounts, isFollowing } from "@/db/queries/profile";
import { FollowButton } from "@/components/dklist/follow-button";
import { AuthorPostForm } from "@/components/dklist/author-post-form";
import { AuthorPostRow } from "@/components/dklist/author-post-row";

export async function generateMetadata({ params }: PageProps<"/yazarhane/[username]">): Promise<Metadata> {
  const { username } = await params;
  const hub = await getAuthorHubByUsername(username);
  if (!hub) return {};

  const name = hub.writerName ?? hub.username;
  return pageMetadata({
    title: `${name} - Yazarhane`,
    description: truncateDescription(hub.writerBiyo || hub.biyo || `${name} - DKList Yazarhanesi'nde yazarın kendi köşesi.`),
    path: `/yazarhane/${hub.username}`,
  });
}

export default function AuthorHubPage({ params }: PageProps<"/yazarhane/[username]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16" />}>
        <AuthorHubContent params={params} />
      </Suspense>
    </div>
  );
}

async function AuthorHubContent({
  params,
}: {
  params: PageProps<"/yazarhane/[username]">["params"];
}) {
  const { username } = await params;
  const hub = await getAuthorHubByUsername(username);
  if (!hub) notFound();

  const session = await auth();
  const viewerId = session?.user?.id ? Number(session.user.id) : null;
  const isOwnHub = viewerId === hub.userId;

  const [posts, counts, viewerFollows] = await Promise.all([
    getAuthorPosts(hub.userId),
    getFollowCounts(hub.userId),
    viewerId && !isOwnHub ? isFollowing(viewerId, hub.userId) : Promise.resolve(false),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-start gap-6">
        <Avatar className="size-20 text-xl">
          <AvatarImage src={avatarUrl(hub.image) ?? undefined} />
          <AvatarFallback>{hub.username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-col gap-2">
          <SectionLabel>Yazarhane</SectionLabel>
          <h1 className="font-heading text-3xl font-medium tracking-tight">
            {hub.writerName ?? `@${hub.username}`}
          </h1>
          {hub.writerName && (
            <Link href={`/yazar/${hub.writerSlug}`} className="text-sm text-muted-foreground hover:underline">
              @{hub.username} · Katalog sayfası →
            </Link>
          )}
          <p className="text-sm text-muted-foreground">
            {hub.writerBiyo ?? hub.biyo ?? "Bu yazar henüz bir biyografi eklemedi."}
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href={`/profil/${hub.username}/takipciler`} className="hover:underline">
              <strong className="text-foreground">{counts.followers}</strong> takipçi
            </Link>
          </div>
        </div>
        {viewerId && !isOwnHub && (
          <FollowButton targetUserId={hub.userId} initialFollowing={viewerFollows} />
        )}
      </div>

      {isOwnHub && (
        <div className="mb-8">
          <AuthorPostForm />
        </div>
      )}

      <div className="flex flex-col gap-4">
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz paylaşım yok.</p>
        ) : (
          posts.map((p) => (
            <AuthorPostRow key={p.id} post={p} canDelete={isOwnHub} />
          ))
        )}
      </div>
    </div>
  );
}
