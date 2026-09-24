import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlayIcon, EyeIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getVideoBySlug, getRecentVideos } from "@/db/queries/videos";
import { getEntityComments, getRepliesForComments } from "@/db/queries/comments";
import { getCommentLikeStates } from "@/db/queries/comment-likes";
import { EntityComments } from "@/components/dklist/entity-comments";
import { ImageWithFallback } from "@/components/dklist/image-with-fallback";
import { ShareButton } from "@/components/dklist/share-button";
import { AdSlot } from "@/components/dklist/ad-slot";
import { JsonLd } from "@/components/dklist/json-ld";
import { VideoViewTracker } from "@/components/dklist/video-view-tracker";
import { addVideoCommentAction, addVideoReplyAction, shareVideoCommentAction } from "@/actions/videos";
import { pageMetadata, truncateDescription } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/video/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);
  if (!video) return {};

  return pageMetadata({
    title: video.title,
    description: truncateDescription(video.title),
    path: `/video/${video.slug}`,
    image: video.youtubeVideoId ? `https://i.ytimg.com/vi/${video.youtubeVideoId}/hqdefault.jpg` : undefined,
  });
}

export default function VideoDetailPage({ params }: PageProps<"/video/[slug]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-[100rem] px-4 py-10 sm:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
          <Suspense fallback={<VideoDetailSkeleton />}>
            <VideoDetailContent params={params} />
          </Suspense>
          <aside className="hidden min-w-0 lg:block">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
              <VideoSidebar params={params} />
            </Suspense>
          </aside>
        </div>
      </div>
    </div>
  );
}

function VideoDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
      <div className="aspect-video w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

async function VideoDetailContent({
  params,
}: {
  params: PageProps<"/video/[slug]">["params"];
}) {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);

  if (!video) {
    notFound();
  }

  const session = await auth();
  const viewerId = session?.user?.id ? Number(session.user.id) : null;

  const comments = await getEntityComments(video.id, "video");
  const commentIds = comments.map((c) => c.id);
  const [repliesByComment, commentLikes] = await Promise.all([
    getRepliesForComments(commentIds),
    getCommentLikeStates(viewerId, commentIds),
  ]);
  const repliesByCommentObj = Object.fromEntries(repliesByComment);

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: video.title,
          description: video.title,
          uploadDate: video.createdDate,
          ...(video.youtubeVideoId
            ? {
                thumbnailUrl: `https://i.ytimg.com/vi/${video.youtubeVideoId}/hqdefault.jpg`,
                embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}`,
              }
            : {}),
        }}
      />
      <VideoViewTracker videoId={video.id} />
      <SectionLabel>Video</SectionLabel>
      <h1 className="font-heading text-4xl font-medium tracking-tight text-balance">
        {video.title}
      </h1>
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <span>{video.createdDate}</span>
        <span className="flex items-center gap-1">
          <EyeIcon className="size-3.5" />
          {video.viewCount}
        </span>
        <span className="ml-auto">
          <ShareButton content={video.title} pointsKey={`video:${video.id}`} />
        </span>
      </div>

      {video.youtubeVideoId ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}`}
            title={video.title}
            className="absolute inset-0 size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <p className="rounded-md bg-secondary p-6 text-center text-sm text-secondary-foreground">
          Bu video artık oynatılamıyor.
        </p>
      )}

      <section className="mt-6 border-t border-border pt-6">
        <h2 className="font-heading mb-4 text-xl font-medium">Yorumlar</h2>
        <EntityComments
          signedIn={Boolean(viewerId)}
          viewerId={viewerId ?? undefined}
          initialComments={comments}
          initialRepliesByComment={repliesByCommentObj}
          commentLikes={commentLikes}
          addCommentAction={addVideoCommentAction.bind(null, video.id, "comment")}
          addReplyAction={addVideoReplyAction}
          shareCommentAction={shareVideoCommentAction}
          placeholder="Bu video hakkında ne düşünüyorsun?"
          emptyMessage="Henüz yorum yok - ilk yorumu sen yaz."
        />
      </section>
    </article>
  );
}

async function VideoSidebar({ params }: { params: PageProps<"/video/[slug]">["params"] }) {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);
  const others = await getRecentVideos(4, video?.id);

  return (
    <div className="sticky top-24 flex flex-col gap-4">
      {others.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Diğer Videolar</h2>
          <ul className="flex flex-col gap-3">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/video/${o.slug}`} className="flex gap-3 rounded-lg -m-1.5 p-1.5 transition-colors hover:bg-accent">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {o.youtubeVideoId ? (
                      <ImageWithFallback
                        src={`https://i.ytimg.com/vi/${o.youtubeVideoId}/hqdefault.jpg`}
                        alt=""
                        className="size-full object-cover"
                        fallback={<div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-accent text-muted-foreground/50"><PlayIcon className="size-4" /></div>}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-accent text-muted-foreground/50"><PlayIcon className="size-4" /></div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col justify-center">
                    <span className="line-clamp-2 text-sm leading-snug font-medium">{o.title}</span>
                    <span className="text-xs text-muted-foreground">{o.createdDate}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Suspense fallback={null}>
        <AdSlot placement="video-post" className="max-w-none px-0" />
      </Suspense>
    </div>
  );
}
