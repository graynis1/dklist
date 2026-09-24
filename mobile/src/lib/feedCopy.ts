import type { FeedItem } from "@/api/feed";

/**
 * Ported verbatim from the web app's `site-feed.tsx` `describe()` - same
 * Turkish copy per reason, so a real event reads identically whether
 * seen on web or mobile. No shared package exists between the two repos
 * yet, so this is a deliberate, hand-kept-in-sync duplicate rather than a
 * refactor of the working web code to share it - re-check this against
 * `v2/src/components/dklist/site-feed.tsx` if `getSiteFeed()`'s reasons
 * ever change.
 */
export function describeFeedItem(item: FeedItem): { verb: string; target: string | null } {
  const target = item.targetLabel ? `"${item.targetLabel}"` : null;
  switch (item.reason) {
    case "book_read":
      return { verb: item.readingDurationDays != null ? `kitabı ${item.readingDurationDays} günde okudu` : "kitabı okudu", target };
    case "reading_progress":
      return { verb: item.progressPercentage ? `kitabının %${item.progressPercentage}'ini tamamladı` : "kitabında ilerledi", target };
    case "social_share":
      if (item.entityKind === "blog") return { verb: "bir blog yazısını paylaştı:", target };
      if (item.entityKind === "store") return { verb: "bir ilanı paylaştı:", target };
      return { verb: "bir kitabı paylaştı:", target };
    case "library_add":
      return { verb: "kitaplığına ekledi", target };
    case "rating": {
      const scoreSuffix = item.ratingValue != null ? ` (${item.ratingValue}/10)` : "";
      if (item.entityKind === "book") return { verb: `kitabını puanladı${scoreSuffix}`, target };
      if (item.entityKind === "writer") return { verb: `yazarını puanladı${scoreSuffix}`, target };
      return { verb: `çevirmenini puanladı${scoreSuffix}`, target };
    }
    case "like":
      if (item.entityKind === "book") return { verb: "kitabını beğendi", target };
      if (item.entityKind === "writer") return { verb: "yazarını beğendi", target };
      if (item.entityKind === "translator") return { verb: "çevirmenini beğendi", target };
      if (item.entityKind === "blog") return { verb: "blog yazısını beğendi:", target };
      return { verb: "yayınevini beğendi", target };
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
    case "reading_status":
      return { verb: item.readStatus === "currentRead" ? "kitabını okumaya başladı" : "kitabını okuma listesine ekledi", target };
    case "reading_goal_set":
      return { verb: item.goalCount ? `bu yıl için ${item.goalCount} kitap okuma hedefi belirledi` : "bu yıl için bir okuma hedefi belirledi", target: null };
    case "reading_goal_achieved":
      return { verb: item.goalCount ? `${item.goalCount} kitaplık yıllık okuma hedefine ulaştı! 🎉` : "yıllık okuma hedefine ulaştı! 🎉", target: null };
    case "badge_earned":
      return { verb: item.badgeName ? `"${item.badgeName}" rozetini kazandı! 🏆` : "yeni bir rozet kazandı! 🏆", target: null };
  }
}
