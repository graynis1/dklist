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

export function FeedItemRow({ item }: { item: FeedItem }) {
  const Icon = item.reason === "comment" && item.isQuote ? QuoteIcon : ICON_BY_REASON[item.reason];
  const { verb, target } = describe(item);
  const body = (
    <div className="flex gap-3 rounded-lg p-3 -mx-3 transition-colors hover:bg-accent">
      <EntityAvatar id={item.actorId} name={item.actorUsername} image={item.actorImage} size="size-9" />
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm leading-relaxed">
          <Link href={`/profil/${item.actorUsername}`} className="font-medium hover:underline">
            @{item.actorUsername}
          </Link>{" "}
          <span className="text-muted-foreground">{verb}</span>
          {target && (
            <>
              <span className="text-muted-foreground"> · </span>
              <span className="font-medium">{target}</span>
            </>
          )}
        </p>
        {item.excerpt && <p className="text-sm text-muted-foreground italic">{item.excerpt}</p>}
        <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
          <Icon className="size-3" />
          {formatRelativeTime(item.createdAt)}
        </span>
      </div>
    </div>
  );

  if (!item.targetHref) return body;
  return <Link href={item.targetHref}>{body}</Link>;
}

export function SiteFeedList({
  initialItems,
  initialCursor,
  followingOnly,
}: {
  initialItems: FeedItem[];
  initialCursor: number | null;
  followingOnly: boolean;
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
    <div className="flex flex-col gap-1 divide-y divide-border">
      {items.map((item) => (
        <FeedItemRow key={item.id} item={item} />
      ))}
      {cursor && (
        <div className="flex justify-center pt-6">
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
