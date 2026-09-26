import { apiFetch } from "@/api/client";

/** Mirrors v2's `FeedItem` (src/db/queries/feed.ts) - kept in sync by
 * hand, same as MobileProfile in api/auth.ts. Only the fields this pass's
 * Akış screen actually renders; the backend returns more (replies, like
 * state) that aren't wired here yet - real next-step scope, not dropped
 * silently, see mobile/README.md. */
export type FeedReason =
  | "book_read"
  | "comment"
  | "rating"
  | "like"
  | "follow"
  | "blog_published"
  | "store_listing"
  | "author_post"
  | "club_join"
  | "library_add"
  | "feed_post"
  | "reading_status"
  | "reading_goal_set"
  | "reading_goal_achieved"
  | "badge_earned"
  | "reading_progress"
  | "social_share";

export interface FeedItem {
  id: number;
  createdAt: string;
  actorId: number;
  actorUsername: string;
  actorImage: string | null;
  reason: FeedReason;
  entityKind: "book" | "writer" | "translator" | "user" | "blog" | "store" | "club" | "publisher" | null;
  isQuote: boolean;
  targetLabel: string | null;
  targetHref: string | null;
  excerpt: string | null;
  quotedText: string | null;
  quotedAuthorUsername: string | null;
  bookCover: { id: number; hasImage: boolean; score: number } | null;
  entityAvatarId: number | null;
  readStatus: "targetRead" | "currentRead" | null;
  goalCount: number | null;
  badgeName: string | null;
  progressPercentage: number | null;
  readingDurationDays: number | null;
  ratingValue: number | null;
  feedPostImage: string | null;
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: number | null;
}

export async function getFeed(cursor?: number | null): Promise<FeedPage> {
  const query = cursor ? `?cursor=${cursor}` : "";
  const result = await apiFetch<{ status: "ok" } & FeedPage>(`/feed${query}`);
  return { items: result.items, nextCursor: result.nextCursor };
}

export interface CreateFeedPostInput {
  text: string;
  image?: { uri: string; name: string; type: string } | null;
  bookId?: number | null;
}

/** Multipart, same shape as api/store.ts's createListing() - see that
 * file's own comment on why apiFetch needs the FormData carve-out. */
export async function createFeedPost(input: CreateFeedPostInput): Promise<{ id: number }> {
  const formData = new FormData();
  formData.append("text", input.text);
  if (input.bookId) formData.append("bookId", String(input.bookId));
  if (input.image) {
    // @ts-expect-error - RN's fetch/FormData accepts this shape for a
    // local asset URI, not a real Blob/File.
    formData.append("image", { uri: input.image.uri, name: input.image.name, type: input.image.type });
  }
  return apiFetch("/feed/post", { method: "POST", body: formData });
}
