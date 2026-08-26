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
import { ShareButton } from "@/components/dklist/share-button";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
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

const SOURCE_LABEL: Record<string, string> = {
  book: "Kitap",
  writer: "Yazar",
  translator: "Çevirmen",
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
  }
}

/**
 * Comments/quotes get the full two-column "forum post" treatment (v1's own
 * Akış reused its book-page CommentComponent wholesale: avatar/text/action-
 * row on the left, a real cover-sized image with a score badge on the
 * right) - the maintainer directly compared v2's first pass unfavorably to
 * that layout ("v1'de olandan da kötü"), so this rebuilds the same shape
 * rather than a smaller decorative tweak: real post text (not a stub),
 * like + share + a link to the full discussion, and a large entity visual
 * instead of a 56px thumbnail buried in a muted box. Everything else (a
 * rating, a follow, a library add) stays a compact single-line card, same
 * as before - v1's Akış never showed those at all, so there's no "worse
 * than v1" comparison to make for that half of the feed.
 */
export function FeedItemRow({ item, signedIn }: { item: FeedItem; signedIn: boolean }) {
  const Icon = item.reason === "comment" && item.isQuote ? QuoteIcon : ICON_BY_REASON[item.reason];
  const { verb, target } = describe(item);
  const isPost = item.reason === "comment" && Boolean(item.excerpt);

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
    </div>
  );

  if (isPost) {
    const sourceLabel = item.entityKind ? SOURCE_LABEL[item.entityKind] : null;
    return (
      <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/15 sm:p-5">
        {header}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap text-foreground/90">
              {item.isQuote && <QuoteIcon className="mr-1.5 inline size-4 -translate-y-0.5 text-muted-foreground/50" />}
              {item.excerpt}
            </p>
            <div className="flex items-center gap-4">
              {item.commentId && (
                <CommentLikeButton
                  commentId={item.commentId}
                  signedIn={signedIn}
                  initialState={item.likeState ?? { count: 0, liked: false }}
                  size="md"
                />
              )}
              {item.targetHref && (
                <Link
                  href={item.targetHref}
                  className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <MessageSquareIcon className="size-4" />
                  Tartışmayı Gör
                </Link>
              )}
              {item.excerpt && (
                <ShareButton content={item.excerpt} url={item.targetHref ?? undefined} size="sm" />
              )}
            </div>
          </div>

          {item.targetHref && (item.bookCover || item.entityAvatarId) && (
            <Link href={item.targetHref} className="flex shrink-0 flex-row items-center gap-3 sm:w-32 sm:flex-col sm:text-center">
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
            </Link>
          )}
        </div>
      </article>
    );
  }

  const compactBody = (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/15">
      {header}
      {item.bookCover && (
        <BookCover
          title={item.targetLabel ?? ""}
          author=""
          tone={toneForId(item.bookCover.id)}
          bookId={item.bookCover.id}
          hasImage={item.bookCover.hasImage}
          size="sm"
          className="ml-auto w-10 shrink-0"
        />
      )}
    </div>
  );

  if (!item.targetHref) return compactBody;
  return (
    <Link href={item.targetHref} className="block">
      {compactBody}
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
