import type { FeedItem, FeedReason } from "@/api/feed";

export type FeedFilter = "all" | "posts" | "reading" | "community";

const POST_REASONS: FeedReason[] = ["comment", "feed_post"];
const READING_REASONS: FeedReason[] = ["book_read", "reading_status", "reading_progress", "library_add", "rating", "like"];

export function matchesFilter(item: FeedItem, filter: FeedFilter): boolean {
  if (filter === "all") return true;
  if (filter === "posts") return POST_REASONS.includes(item.reason);
  if (filter === "reading") return READING_REASONS.includes(item.reason);
  return !POST_REASONS.includes(item.reason) && !READING_REASONS.includes(item.reason);
}

/** A card in the feed: a real post (comment/feed_post, interactive), or one
 * or more of the same person's passive activities merged together. */
export type FeedGroup =
  | { kind: "post"; key: string; item: FeedItem }
  | { kind: "sameTarget"; key: string; items: FeedItem[] }
  | { kind: "sameReason"; key: string; items: FeedItem[] };

const MERGE_WINDOW_MS = 24 * 60 * 60 * 1000;

function within(a: FeedItem, b: FeedItem) {
  return Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) < MERGE_WINDOW_MS;
}

/** Facebook-style aggregation: the feed API returns one row per event, so a
 * single "liked, started reading and rated this book" moment arrives as
 * three near-identical cards. Consecutive passive events by the same person
 * are folded into one card - either several actions on the same target, or
 * the same action across several targets ("3 kulübe katıldı"). */
export function groupFeed(items: FeedItem[]): FeedGroup[] {
  const out: FeedGroup[] = [];
  for (const item of items) {
    if (POST_REASONS.includes(item.reason) || item.reason === "badge_earned" || item.reason.startsWith("reading_goal")) {
      out.push({ kind: "post", key: `p-${item.id}`, item });
      continue;
    }
    const prev = out[out.length - 1];
    if (prev && prev.kind !== "post") {
      const first = prev.items[0];
      const sameActor = first.actorId === item.actorId && within(first, item);
      if (sameActor && item.targetHref && prev.items.every((i) => i.targetHref === item.targetHref) && !prev.items.some((i) => i.reason === item.reason)) {
        out[out.length - 1] = { kind: "sameTarget", key: prev.key, items: [...prev.items, item] };
        continue;
      }
      if (sameActor && prev.items.every((i) => i.reason === item.reason && i.readStatus === item.readStatus) && !prev.items.some((i) => i.targetHref === item.targetHref)) {
        out[out.length - 1] = { kind: "sameReason", key: prev.key, items: [...prev.items, item] };
        continue;
      }
    }
    out.push({ kind: "sameTarget", key: `a-${item.id}`, items: [item] });
  }
  return out;
}

/** Short past-tense action phrase used when several actions share one
 * target ("beğendi, okumaya başladı ve 10/10 puan verdi"). */
export function shortAction(item: FeedItem): string {
  switch (item.reason) {
    case "like":
      return "beğendi";
    case "reading_status":
      return item.readStatus === "currentRead" ? "okumaya başladı" : "okuma listesine ekledi";
    case "rating":
      return item.ratingValue != null ? `${item.ratingValue}/10 puan verdi` : "puanladı";
    case "book_read":
      if (item.readingDurationDays == null) return "okudu";
      return item.readingDurationDays <= 0 ? "aynı gün bitirdi" : `${item.readingDurationDays} günde bitirdi`;
    case "library_add":
      return "kitaplığına ekledi";
    case "reading_progress":
      return item.progressPercentage ? `%${item.progressPercentage}'ini okudu` : "okumaya devam ediyor";
    case "club_join":
      return "katıldı";
    case "follow":
      return "takip etmeye başladı";
    default:
      return "etkileşimde bulundu";
  }
}

export function joinTr(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} ve ${parts[parts.length - 1]}`;
}

/** "3 kitabı okudu", "3 kulübe katıldı" - headline for a same-reason group. */
export function multiHeadline(reason: FeedReason, n: number, entityKind: FeedItem["entityKind"], readStatus?: FeedItem["readStatus"]): string {
  switch (reason) {
    case "club_join":
      return `${n} kulübe katıldı`;
    case "follow":
      return `${n} kişiyi takip etmeye başladı`;
    case "book_read":
      return `${n} kitap bitirdi`;
    case "rating":
      return `${n} ${entityKind === "book" ? "kitabı" : "şeyi"} puanladı`;
    case "like":
      return `${n} ${entityKind === "book" ? "kitabı" : "içeriği"} beğendi`;
    case "library_add":
      return `kitaplığına ${n} kitap ekledi`;
    case "reading_status":
      return readStatus === "currentRead" ? `${n} kitabı okumaya başladı` : `${n} kitabı okuma listesine aldı`;
    case "blog_published":
      return `${n} blog yazısı yayınladı`;
    case "store_listing":
      return `${n} askıda kitap ilanı verdi`;
    default:
      return `${n} yeni etkinlik`;
  }
}
