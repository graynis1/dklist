import { apiFetch } from "@/api/client";

/** Mirrors comments.ts's CommentReply / feed-posts.ts's own reply shape -
 * both resolve to the same fields, just rooted at different parent types. */
export interface FeedReply {
  id: number;
  text: string;
  authorUsername: string;
  authorUserId: number;
  authorImage: string | null;
  profileFrame: string | null;
  frameTier: 1 | 2 | 3 | 4;
  replies: FeedReply[];
}

export interface FeedLikeState {
  count: number;
  liked: boolean;
  dislikeCount: number;
  disliked: boolean;
}

/** Mirrors v2's `FeedItem` (src/db/queries/feed.ts) - kept in sync by
 * hand, same as MobileProfile in api/auth.ts. */
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
  profileFrame: string | null;
  frameTier: 1 | 2 | 3 | 4;
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
  /** Set only for reason "comment" - the real like button (comment_like). */
  commentId: number | null;
  likeState: FeedLikeState | null;
  /** Set only for reason "feed_post" - its own, separate like system. */
  feedPostId: number | null;
  postLikeState: FeedLikeState | null;
  /** Present for both "comment" and "feed_post" reasons - which id/type a
   * reply should be posted against. */
  replyTarget: { parentType: "comment" | "feedPost"; parentId: number } | null;
  replies: FeedReply[];
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

export async function reactToComment(commentId: number, value: 1 | -1) {
  return apiFetch<{ status: "ok"; reaction: 1 | -1 | null }>(`/comment/${commentId}/react`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export async function reactToFeedPost(postId: number, value: 1 | -1) {
  return apiFetch<{ status: "ok"; reaction: 1 | -1 | null }>(`/feed/${postId}/react`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export async function replyToFeedItem(target: { parentType: "comment" | "feedPost"; parentId: number }, text: string) {
  const path = target.parentType === "comment" ? `/comment/${target.parentId}/reply` : `/feed/${target.parentId}/reply`;
  return apiFetch<{ status: "ok"; id: number }>(path, { method: "POST", body: JSON.stringify({ text }) });
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
