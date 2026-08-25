"use client";

import { useState, useTransition } from "react";
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
} from "lucide-react";
import { EntityAvatar } from "@/components/dklist/entity-avatar";
import { BookCover, toneForId } from "@/components/dklist/book-cover";
import { CommentLikeButton } from "@/components/dklist/comment-like-button";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, cn } from "@/lib/utils";
import { loadMoreFeedAction } from "@/app/akis/actions";
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
} as const;

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
      if (item.isQuote) return { verb: "alıntı paylaştı", target };
      return { verb: "hakkında yorum yaptı", target };
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
  }
}

/**
 * Comments/quotes get the full "forum post" treatment (a book cover, a
 * real blockquote, more vertical room) since they're the only feed items
 * that carry actual written content - everything else (a rating, a follow,
 * a library add) stays a compact card so the feed doesn't inflate a
 * one-line fact into fake-looking post real estate.
 */
export function FeedItemRow({ item, signedIn }: { item: FeedItem; signedIn: boolean }) {
  const Icon = item.reason === "comment" && item.isQuote ? QuoteIcon : ICON_BY_REASON[item.reason];
  const { verb, target } = describe(item);
  const isPost = item.reason === "comment" && Boolean(item.excerpt);

  const body = (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/15",
        isPost && "sm:gap-4 sm:p-5",
      )}
    >
      <EntityAvatar id={item.actorId} name={item.actorUsername} image={item.actorImage} size="size-9" className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-sm leading-relaxed">
          <Link href={`/profil/${item.actorUsername}`} className="font-medium hover:underline">
            @{item.actorUsername}
          </Link>
          <span className="text-muted-foreground">{verb}</span>
          {target && !isPost && <span className="font-medium">{target}</span>}
          <span className="text-muted-foreground/60">·</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
            <Icon className="size-3" />
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>

        {isPost ? (
          <div className="flex gap-3 rounded-lg bg-muted/40 p-3">
            {item.bookCover && (
              <BookCover
                title={item.targetLabel ?? ""}
                author=""
                tone={toneForId(item.bookCover.id)}
                bookId={item.bookCover.id}
                hasImage={item.bookCover.hasImage}
                size="sm"
                className="w-14 shrink-0"
              />
            )}
            <div className="flex min-w-0 flex-col gap-1">
              {target && <p className="truncate text-xs font-medium text-muted-foreground">{target}</p>}
              <p className="relative text-sm leading-relaxed text-foreground/90">
                <QuoteIcon className="mr-1 inline size-3.5 -translate-y-0.5 text-muted-foreground/50" />
                {item.excerpt}
              </p>
              {item.commentId && (
                <CommentLikeButton
                  commentId={item.commentId}
                  signedIn={signedIn}
                  initialState={item.likeState ?? { count: 0, liked: false }}
                />
              )}
            </div>
          </div>
        ) : (
          item.bookCover && (
            <div className="flex items-center gap-2">
              <BookCover
                title={item.targetLabel ?? ""}
                author=""
                tone={toneForId(item.bookCover.id)}
                bookId={item.bookCover.id}
                hasImage={item.bookCover.hasImage}
                size="sm"
                className="w-10 shrink-0"
              />
            </div>
          )
        )}
      </div>
    </div>
  );

  if (!item.targetHref) return body;
  return (
    <Link href={item.targetHref} className="block">
      {body}
    </Link>
  );
}

export function SiteFeedList({
  initialItems,
  initialCursor,
  followingOnly,
  signedIn,
}: {
  initialItems: FeedItem[];
  initialCursor: number | null;
  followingOnly: boolean;
  signedIn: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {followingOnly ? "Takip ettiklerinden henüz bir etkinlik yok." : "Henüz bir etkinlik yok."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <FeedItemRow key={item.id} item={item} signedIn={signedIn} />
      ))}
      {cursor && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const page = await loadMoreFeedAction(cursor, followingOnly);
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
