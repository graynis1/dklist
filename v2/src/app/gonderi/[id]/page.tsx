import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/dklist/site-header";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { getFeedPostById } from "@/db/queries/feed-posts";
import { getUserDecorations, decorationFor } from "@/db/queries/user-decorations";
import { feedPostImageUrl } from "@/lib/image-urls";
import { pageMetadata, truncateDescription } from "@/lib/seo";
import { formatRelativeTime } from "@/lib/utils";

/**
 * Real permalink for a standalone feed post - see getFeedPostById()'s doc
 * comment for the exact customer report this closes ("sadece dk şeklinde
 * sitenin linkini çekiyor"). Deliberately minimal - just enough to give
 * external shares a real, accurate preview and a real page to land on,
 * not a rebuild of the full /akis card (reactions/replies stay on the
 * timeline itself, one click away via "Akışta Gör" below).
 */
export async function generateMetadata({ params }: PageProps<"/gonderi/[id]">): Promise<Metadata> {
  const { id } = await params;
  const post = await getFeedPostById(Number(id));
  if (!post) return {};

  const description = truncateDescription(
    post.text ? `@${post.authorUsername}: "${post.text}"` : `@${post.authorUsername} DKList'te bir gönderi paylaştı.`,
  );

  return pageMetadata({
    title: post.text ? `@${post.authorUsername}: "${post.text.length > 60 ? `${post.text.slice(0, 60)}...` : post.text}"` : `@${post.authorUsername}'in gönderisi`,
    description,
    path: `/gonderi/${post.id}`,
    image: post.image ? feedPostImageUrl(post.image) : undefined,
  });
}

export default function FeedPostPage({ params }: PageProps<"/gonderi/[id]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <Suspense fallback={<div className="mx-auto max-w-xl px-6 py-16" />}>
        <FeedPostContent params={params} />
      </Suspense>
    </div>
  );
}

async function FeedPostContent({ params }: { params: PageProps<"/gonderi/[id]">["params"] }) {
  const { id } = await params;
  const post = await getFeedPostById(Number(id));
  if (!post) notFound();

  const decoration = decorationFor(await getUserDecorations([post.authorUserId]), post.authorUserId);

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2.5">
          <EntityAvatar
            id={post.authorUserId}
            name={post.authorUsername}
            image={post.authorImage}
            size="size-9"
            profileFrame={decoration.profileFrame}
            frameTier={decoration.frameTier}
            highestBadge={decoration.highestBadge}
          />
          <div className="flex flex-col">
            <Link href={`/profil/${post.authorUsername}`} className="font-medium hover:underline">
              @{post.authorUsername}
            </Link>
            <span className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</span>
          </div>
        </div>

        {post.text && <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap text-foreground/90">{post.text}</p>}

        {post.image && (
          <div className="flex w-full justify-center overflow-hidden rounded-lg border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={feedPostImageUrl(post.image)} alt="" className="max-h-[420px] w-auto max-w-full object-contain" />
          </div>
        )}

        {post.bookId && post.bookSlug && (
          <Link
            href={`/kitap/${post.bookSlug}`}
            className="rounded-lg border border-border bg-muted/30 p-2.5 text-sm font-medium hover:bg-muted/60"
          >
            📖 {post.bookName}
          </Link>
        )}

        <Link href="/akis" className="mt-2 w-fit text-sm text-primary hover:underline">
          Akışta Gör →
        </Link>
      </article>
    </div>
  );
}
