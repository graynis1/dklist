import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";
import { SiteHeader } from "@/components/dklist/site-header";
import { SectionLabel } from "@/components/dklist/star-rating";
import { getBlogBySlug, getRecentBlogPosts, getBlogLikeState } from "@/db/queries/blog";
import { getEntityComments, getRepliesForComments } from "@/db/queries/comments";
import { getCommentLikeStates } from "@/db/queries/comment-likes";
import { getUserDecorations, decorationFor } from "@/db/queries/user-decorations";
import { DeleteBlogButton } from "@/components/dklist/delete-blog-button";
import { HashtagText } from "@/components/dklist/hashtag-text";
import { ShareButton } from "@/components/dklist/share-button";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { ImageWithFallback } from "@/components/dklist/image-with-fallback";
import { AdSlot } from "@/components/dklist/ad-slot";
import { JsonLd } from "@/components/dklist/json-ld";
import { EntityComments } from "@/components/dklist/entity-comments";
import { BlogLikeButton } from "@/components/dklist/blog-like-button";
import { BlogCommentsToggle } from "@/components/dklist/blog-comments-toggle";
import { BlogViewTracker } from "@/components/dklist/blog-view-tracker";
import { addBlogCommentAction, addBlogReplyAction, shareBlogCommentAction } from "@/actions/blog";
import { EyeIcon } from "lucide-react";
import { pageMetadata, truncateDescription } from "@/lib/seo";

const ELEVATED_ROLES = [USER_TYPES.Admin, USER_TYPES.Mod];

/** A cheap real-tag sniff (not a full HTML validator) - good enough to tell
 * "this is markup" apart from plain text that happens to contain a bare
 * `<`/`>` character (e.g. "5 < 10 kitap okudum"). See the content-rendering
 * comment below for why this distinction exists at all. */
function looksLikeHtml(text: string): boolean {
  return /<\/?(p|div|h[1-6]|strong|em|b|i|ul|ol|li|a|img|br|span|blockquote)\b[^>]*>/i.test(text);
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);
  if (!post || !post.approved) return {};

  return pageMetadata({
    title: post.title,
    description: truncateDescription(post.preview || post.title),
    path: `/blog/${post.slug}`,
    image: post.img ?? undefined,
  });
}

/**
 * Real article-page layout, not a single narrow text column with empty
 * margins on a wide screen ("Yazının içi de dümdüz aşağı kayan şekilde
 * yanlar bomboş olmayacak") - a sidebar (other posts, an ad slot) fills
 * the space next to the article, same shape a real news/magazine site
 * article page uses. The article column itself stays a readable prose
 * width (max-w-3xl) - only the empty margins around it are the problem
 * being fixed, not the text's own line length.
 */
export default function BlogDetailPage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <div className="flex-1 bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-[100rem] px-4 py-10 sm:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
          <Suspense fallback={<BlogDetailSkeleton />}>
            <BlogDetailContent params={params} />
          </Suspense>
          <aside className="hidden min-w-0 lg:block">
            <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
              <BlogSidebar params={params} />
            </Suspense>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BlogDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded bg-muted" />
    </div>
  );
}

async function BlogDetailContent({
  params,
}: {
  params: PageProps<"/blog/[slug]">["params"];
}) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) {
    notFound();
  }

  const session = await auth();
  const viewerId = session?.user?.id ? Number(session.user.id) : null;
  const isOwner = viewerId !== null && post.ownerId === viewerId;
  const isElevated = hasRole(session?.user?.userType, ELEVATED_ROLES);
  const canManage = isOwner || isElevated;
  const ownerDecoration = post.ownerId != null ? decorationFor(await getUserDecorations([post.ownerId]), post.ownerId) : undefined;

  const likeState = await getBlogLikeState(viewerId, post.id);
  const comments = await getEntityComments(post.id, "blog");
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
          "@type": "Article",
          headline: post.title,
          description: post.preview,
          datePublished: post.createdDate,
          ...(post.img ? { image: post.img } : {}),
          ...(post.ownerUsername ? { author: { "@type": "Person", name: post.ownerUsername } } : {}),
        }}
      />
      <BlogViewTracker blogId={post.id} />
      <SectionLabel>Blog</SectionLabel>
      <h1 className="font-heading text-4xl font-medium tracking-tight text-balance">
        {post.title}
      </h1>
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        {post.ownerUsername && post.ownerId != null && (
          <EntityAvatar
            id={post.ownerId}
            name={post.ownerUsername}
            image={post.ownerImage}
            size="size-8"
            profileFrame={ownerDecoration?.profileFrame}
            frameTier={ownerDecoration?.frameTier}
            highestBadge={ownerDecoration?.highestBadge}
          />
        )}
        <span>
          {post.ownerUsername ? (
            <Link href={`/profil/${post.ownerUsername}`} className="font-medium text-foreground hover:underline">
              @{post.ownerUsername}
            </Link>
          ) : null}
          {post.ownerUsername ? " · " : ""}
          {post.createdDate}
        </span>
        {/* Real customer report: "kaç kez okunduğu yada tıklandığı verisi
            olmalı" - blog.viewCount already existed, just never shown. */}
        <span className="flex items-center gap-1">
          <EyeIcon className="size-3.5" />
          {post.viewCount}
        </span>
        <span className="ml-auto">
          <ShareButton content={post.title} pointsKey={`blog:${post.id}`} />
        </span>
      </div>

      {isOwner && !post.approved && (
        <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
          Bu yazı henüz onaylanmadı, sadece siz ve moderatörler görebiliyor.
        </p>
      )}
      {isOwner && post.hasPendingRevision && (
        <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
          Onay bekleyen bir değişikliğiniz var - onaylanana kadar aşağıdaki (yayındaki) sürüm görünmeye devam edecek.
        </p>
      )}

      {post.img && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
          <Image src={post.img} alt={post.title} fill className="object-cover" unoptimized />
        </div>
      )}

      {post.content && (looksLikeHtml(post.content) ? (
        // Real bug found while redesigning this page: `content` holds two
        // genuinely different real formats - legacy/imported posts embed
        // real <p>/<strong>/<img> HTML (visible on a real post as literal
        // "<h3><strong>..." text once rendered through HashtagText, which
        // escapes everything as plain text - correct for comments, wrong
        // here), while /blog/yeni's plain <textarea> stores newline-
        // separated plain text. Same "two coexisting formats in one
        // column" shape as the blogImageUrl() Cloudinary-vs-filename bug
        // fixed earlier - detect and render each correctly instead of
        // assuming one. Blog authoring is gated to Blogger/Mod/Admin and
        // every post needs an Admin approval pass before going live (see
        // the pending-revision banner above), so the HTML branch isn't
        // arbitrary public input the way a comment is.
        <div
          className="mt-4 text-[1.05rem] leading-[1.8] text-foreground [&_a]:text-primary [&_a]:underline [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:font-heading [&_h1]:text-2xl [&_h1]:font-medium [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-medium [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:font-heading [&_h3]:text-lg [&_h3]:font-medium [&_img]:my-4 [&_img]:w-full [&_img]:rounded-lg [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-4"
          // No typography plugin installed - the tag-targeted utilities
          // above are the deliberate substitute (avoids adding a new
          // dependency under time pressure, matching this project's own
          // documented caution about mid-session package additions).
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      ) : (
        <div className="mt-4 leading-relaxed whitespace-pre-line text-foreground">
          <HashtagText text={post.content} />
        </div>
      ))}

      {/* Real customer report: no like/dislike at all on blog posts,
          unlike every other content type. An extra share button lives
          here too ("daha çok paylaşmaya sevk etmek için... yanına da
          ekstra paylaş eklenebilir") - the one at the top stays as-is. */}
      <div className="mt-6 flex items-center gap-2 border-t border-border pt-4">
        <BlogLikeButton blogId={post.id} signedIn={Boolean(viewerId)} initialState={likeState} />
        <ShareButton content={post.title} pointsKey={`blog:${post.id}`} />
      </div>

      {canManage && (
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/blog/${slug}/duzenle`} className="underline hover:text-foreground">
            Düzenle
          </Link>
          <DeleteBlogButton blogId={post.id} />
          <BlogCommentsToggle blogId={post.id} initialDisabled={post.commentsDisabled} />
        </div>
      )}

      <section className="mt-6 border-t border-border pt-6">
        <h2 className="font-heading mb-4 text-xl font-medium">Yorumlar</h2>
        <EntityComments
          signedIn={Boolean(viewerId)}
          viewerId={viewerId ?? undefined}
          initialComments={comments}
          initialRepliesByComment={repliesByCommentObj}
          commentLikes={commentLikes}
          addCommentAction={addBlogCommentAction.bind(null, post.id, "comment")}
          addReplyAction={addBlogReplyAction}
          shareCommentAction={shareBlogCommentAction}
          commentingDisabled={post.commentsDisabled}
          placeholder="Bu yazı hakkında ne düşünüyorsun?"
          emptyMessage="Henüz yorum yok - ilk yorumu sen yaz."
        />
      </section>
    </article>
  );
}

async function BlogSidebar({ params }: { params: PageProps<"/blog/[slug]">["params"] }) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);
  const others = await getRecentBlogPosts(4, post?.id);

  return (
    <div className="sticky top-24 flex flex-col gap-4">
      {others.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Diğer Yazılar</h2>
          <ul className="flex flex-col gap-3">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/blog/${o.slug}`} className="flex gap-3 rounded-lg -m-1.5 p-1.5 transition-colors hover:bg-accent">
                  <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {o.img ? (
                      <ImageWithFallback
                        src={o.img}
                        alt=""
                        className="size-full object-cover"
                        fallback={<div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-accent text-xs text-muted-foreground/50">DK</div>}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-muted to-accent text-xs text-muted-foreground/50">DK</div>
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
        <AdSlot placement="akis-sidebar" className="max-w-none px-0" />
      </Suspense>
    </div>
  );
}
