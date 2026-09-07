import type { FeedReason } from "@/db/queries/feed";

/**
 * Just the fields `describeFeedItem()` actually needs, not the full
 * `FeedItem` shape - keeps this module free of any DB/query-layer import
 * so it stays a pure, trivially-testable function (extracted from
 * `site-feed.tsx`'s `describe()`, same logic, no behavior change).
 */
export interface FeedItemDescriptionInput {
  reason: FeedReason;
  entityKind: "book" | "writer" | "translator" | "user" | "blog" | "store" | "club" | null;
  isQuote: boolean;
  targetLabel: string | null;
}

/**
 * Maps a feed item's (reason, entityKind, isQuote, targetLabel) to the
 * Turkish verb phrase + optional quoted/at-mentioned target shown in its
 * feed card - e.g. "kitabını puanladı" + `"Suç ve Ceza"`, or "takip etmeye
 * başladı" + `@ahmet`. `follow` is the one reason that at-mentions its
 * target (`@username`) instead of quoting it; `comment`/`author_post`/
 * `feed_post` never show a target label at all (the card's own body/excerpt
 * carries that context instead).
 */
export function describeFeedItem(item: FeedItemDescriptionInput): { verb: string; target: string | null } {
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
