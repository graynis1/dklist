"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpenIcon,
  StarIcon,
  HeartIcon,
  MessageSquareIcon,
  QuoteIcon,
  UserPlusIcon,
  NewspaperIcon,
  TagIcon,
  PenLineIcon,
  UsersIcon,
  LibraryIcon,
  Trash2Icon,
} from "lucide-react";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { CommentLikeButton } from "@/components/dklist/comment-like-button";
import { FeedPostLikeButton } from "@/components/dklist/feed-post-like-button";
import { FeedReplyThread } from "@/components/dklist/feed-reply-thread";
import { ShareButton } from "@/components/dklist/share-button";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { feedPostImageUrl } from "@/lib/image-urls";
import { loadMoreFeedAction, deleteFeedPostAction } from "@/app/akis/actions";
import type { FeedItem } from "@/db/queries/feed";

const ICON_BY_REASON = {
  book_read: BookOpenIcon,
  library_add: LibraryIcon,
  rating: StarIcon,
  like: HeartIcon,
  comment: MessageSquareIcon,
  follow: UserPlusIcon,
  blog_published: NewspaperIcon,
  store_listing: TagIcon,
  author_post: PenLineIcon,
  club_join: UsersIcon,
  feed_post: MessageSquareIcon,
} as const;

const SOURCE_LABEL: Record<string, string> = {
  book: "Kitap",
  writer: "Yazar",
  translator: "Çevirmen",
};

const GO_TO_LABEL: Record<string, string> = {
  book: "Kitaba Git",
  writer: "Yazara Git",
  translator: "Çevirmene Git",
  user: "Profile Git",
  blog: "Yazıyı Oku",
  store: "İlanı Gör",
  club: "Kulübe Git",
};

function describe(item: FeedItem): { verb: string; target: string | null } {
  const target = item.targetLabel ? `"${item.targetLabel}"` : null;
  switch (item.reason) {
    case "book_read":
      return { verb: "kitabı okudu", target };
    case "library_add":
      return { verb: "kitaplığına ekledi", target };
    case "rating":
      if (item.entityKind === "book") return { verb: "kitabını puanladı", target };
      if (item.entityKind === "writer") return { verb: "yazarını puanladı", target };
      return { verb: "çevirmenini puanladı", target };
    case "like":
      if (item.entityKind === "book") return { verb: "kitabını beğendi", target };
      if (item.entityKind === "writer") return { verb: "yazarını beğendi", target };
      return { verb: "çevirmenini beğendi", target };
    case "comment":
      if (item.isQuote) return { verb: "bir alıntı paylaştı", target: null };
      return { verb: "bir yorum yazdı", target: null };
    case "follow":
      return { verb: "takip etmeye başladı", target: item.targetLabel ? `@${item.targetLabel}` : null };
    case "blog_published":
      return { verb: "yeni bir blog yazısı yayınladı:", target };
    case "store_listing":
      return { verb: "askıda kitap ilanı verdi:", target };
    case "author_post":
      return { verb: "Yazarhane'de yeni bir yazı paylaştı", target: null };
    case "club_join":
      return { verb: "kulübüne katıldı", target };
    case "feed_post":
      return { verb: "bir gönderi paylaştı", target: null };
  }
}

/**
 * Every feed item renders as a real post card now - the maintainer's blunt
 * correction ("gönderi tarzında olacak lan bu ne") after a first pass that
 * only gave comments/quotes/standalone posts the full card treatment and
 * left everything else (a rating, a "kitaplığına ekledi", a follow) as a
 * thin single-line row with a 40px thumbnail - next to real posts, a whole
 * feed of those in a row genuinely does read as a notification-log dump,
 * not a social feed. Same card shell, same header, same size cover for
 * every reason now; only the middle body differs (excerpt+actions+replies
 * for comments/posts, a plain but properly-sized verb+target line for
 * everything else) - and that cover always renders at real size (BookCover
 * "md", not squeezed into a 40px corner icon).
 */
export function FeedItemRow({ item, signedIn, viewerId }: { item: FeedItem; signedIn: boolean; viewerId: number | null }) {
  const router = useRouter();
  const [deleted, setDeleted] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const Icon = item.reason === "comment" && item.isQuote ? QuoteIcon : ICON_BY_REASON[item.reason];
  const { verb, target } = describe(item);
  const isPost = (item.reason === "comment" && Boolean(item.excerpt)) || item.reason === "feed_post";
  const isOwnPost = item.reason === "feed_post" && viewerId != null && viewerId === item.actorId;
  const sourceLabel = item.entityKind ? SOURCE_LABEL[item.entityKind] : null;

  if (deleted) return null;

  const header = (
    <div className="flex items-center gap-2.5">
      <EntityAvatar id={item.actorId} name={item.actorUsername} image={item.actorImage} size="size-9" className="shrink-0" />
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-1.5 text-sm leading-tight">
          <Link href={`/profil/${item.actorUsername}`} className="font-medium hover:underline">
            @{item.actorUsername}
          </Link>
          <span className="text-muted-foreground">{verb}</span>
          {target && !isPost && <span className="font-medium">{target}</span>}
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
          <Icon className="size-3" />
          {formatRelativeTime(item.createdAt)}
        </span>
      </div>
      {isOwnPost && (
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => {
            if (!window.confirm("Bu gönderiyi silmek istediğinizden emin misiniz?")) return;
            startDelete(async () => {
              const result = await deleteFeedPostAction(item.feedPostId!);
              if (result.status) {
                setDeleted(true);
                router.refresh();
              }
            });
          }}
          className="ml-auto shrink-0 text-muted-foreground/60 transition-colors hover:text-destructive disabled:opacity-50"
          aria-label="Gönderiyi sil"
        >
          <Trash2Icon className="size-4" />
        </button>
      )}
    </div>
  );

  const cover = (item.bookCover || item.entityAvatarId) && (
    <div className="flex shrink-0 flex-row items-center gap-3 sm:w-32 sm:flex-col sm:text-center">
      {item.bookCover ? (
        <BookCover
          title={item.targetLabel ?? ""}
          author=""
          tone={toneForId(item.bookCover.id)}
          bookId={item.bookCover.id}
          hasImage={item.bookCover.hasImage}
          size="md"
          className="w-16 shrink-0 sm:w-full"
        />
      ) : (
        item.entityAvatarId != null && (
          <EntityAvatar id={item.entityAvatarId} name={item.targetLabel ?? "?"} size="size-16" className="shrink-0 sm:size-20" />
        )
      )}
      <div className="flex min-w-0 flex-col sm:items-center">
        {item.targetLabel && <p className="truncate text-sm font-medium sm:w-full">{item.targetLabel}</p>}
        {sourceLabel && <p className="text-xs text-muted-foreground">Kaynak: {sourceLabel}</p>}
      </div>
    </div>
  );

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/15 sm:p-5">
      {header}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {isPost ? (
            <>
              {item.excerpt && (
                <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {item.isQuote && <QuoteIcon className="mr-1.5 inline size-4 -translate-y-0.5 text-muted-foreground/50" />}
                  {item.excerpt}
                </p>
              )}
              {item.reason === "feed_post" && item.feedPostImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={feedPostImageUrl(item.feedPostImage)}
                  alt=""
                  className="max-h-[28rem] w-full rounded-lg border border-border object-cover"
                />
              )}
              <div className="flex flex-wrap items-center gap-2">
                {item.commentId && (
                  <CommentLikeButton
                    commentId={item.commentId}
                    signedIn={signedIn}
                    initialState={item.likeState ?? { count: 0, liked: false, dislikeCount: 0, disliked: false }}
                    size="md"
                  />
                )}
                {item.feedPostId && (
                  <FeedPostLikeButton
                    postId={item.feedPostId}
                    signedIn={signedIn}
                    initialState={item.postLikeState ?? { count: 0, liked: false, dislikeCount: 0, disliked: false }}
                  />
                )}
                {item.replyTarget && (
                  <FeedReplyThread
                    parentType={item.replyTarget.parentType}
                    parentId={item.replyTarget.parentId}
                    initialReplies={item.replies}
                    signedIn={signedIn}
                  />
                )}
                {item.reason === "comment" && item.targetHref && (
                  <Link
                    href={item.targetHref}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  >
                    <MessageSquareIcon className="size-4" />
                    Tartışmayı Gör
                  </Link>
                )}
                {item.excerpt && <ShareButton content={item.excerpt} url={item.targetHref ?? undefined} />}
              </div>
            </>
          ) : (
            item.targetHref && (
              <Link
                href={item.targetHref}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon className="size-4" />
                {(item.entityKind && GO_TO_LABEL[item.entityKind]) ?? "Detayları Gör"}
              </Link>
            )
          )}
        </div>

        {item.targetHref ? <Link href={item.targetHref}>{cover}</Link> : cover}
      </div>
    </article>
  );
}

export function SiteFeedList({
  initialItems,
  initialCursor,
  followingOnly,
  signedIn,
  viewerId,
  mode = "posts",
}: {
  initialItems: FeedItem[];
  initialCursor: number | null;
  followingOnly: boolean;
  signedIn: boolean;
  viewerId: number | null;
  mode?: "posts" | "activity";
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {mode === "activity"
          ? "Henüz okuma etkinliği yok."
          : followingOnly
            ? "Takip ettiklerinden henüz bir gönderi yok."
            : "Henüz bir gönderi yok."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <FeedItemRow key={item.id} item={item} signedIn={signedIn} viewerId={viewerId} />
      ))}
      {cursor && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const page = await loadMoreFeedAction(cursor, followingOnly, mode);
                setItems((prev) => [...prev, ...page.items]);
                setCursor(page.nextCursor);
              })
            }
          >
            {isPending ? "Yükleniyor..." : "Daha Fazla Yükle"}
          </Button>
        </div>
      )}
    </div>
  );
}
