import "server-only";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  pointTransaction,
  user,
  book,
  writer,
  translator,
  comment,
  blog,
  store,
  bookClub,
  follow,
  feedPost,
} from "@/db/schema";
import { getCommentLikeStates, type CommentLikeState } from "@/db/queries/comment-likes";
import { getFeedPostLikeStates, getRepliesForPosts, type FeedPostLikeState } from "@/db/queries/feed-posts";
import { getRepliesForComments, type CommentReply, type SubCommentParentType } from "@/db/queries/comments";
import { getUserDecorations, decorationFor } from "@/db/queries/user-decorations";
import type { FrameTier } from "@/lib/profile-frame-tier";

/**
 * Site-wide activity feed ("akış") - the customer explicitly called the
 * homepage's small "Son Etkinlikler" widget (book-comments only) "saçmalık"
 * and asked for a real, separate feed page. `point_transaction` already
 * logs almost every meaningful user action with a real timestamp and a
 * `reasonKey` that encodes the acted-on entity (see points.ts's own
 * award call sites) - reusing it here as the feed's backbone means no new
 * tracking schema, and it's a strictly richer signal than the old
 * book-comment-only widget (adds ratings, likes, follows, blog posts,
 * marketplace listings, club joins, library adds).
 *
 * Deliberately excluded reasons: daily_visit/message_received (not
 * genuinely public-interesting), social_share (the share itself has no
 * public target beyond the entity already shown elsewhere),
 * point_store_redeem (a private purchase, not a social action).
 */
const FEED_REASONS = [
  "book_read",
  "comment",
  "rating",
  "like",
  "follow",
  "blog_published",
  "store_listing",
  "author_post",
  "club_join",
  "library_add",
  "feed_post",
] as const;

export type FeedReason = (typeof FEED_REASONS)[number];

/**
 * Maintainer's explicit correction: real posts (a review, a quote, a
 * standalone status update) belong in the main feed; passive derived
 * activity ("X kitabı okudu", "X kitaplığına ekledi", "X takip etmeye
 * başladı"...) reads as notification-log noise mixed in with them and
 * "başka bir alana taşınmalı" - moved to its own tab instead
 * (getSiteFeed's `mode` param), not deleted - it's still real, useful
 * signal, just not what belongs in a "gönderiler" timeline.
 */
const POST_REASONS = ["comment", "feed_post"] as const satisfies readonly FeedReason[];
const ACTIVITY_REASONS = FEED_REASONS.filter(
  (r) => !(POST_REASONS as readonly string[]).includes(r),
) as FeedReason[];

export interface FeedItem {
  id: number;
  createdAt: string;
  actorId: number;
  actorUsername: string;
  actorImage: string | null;
  profileFrame: string | null;
  frameTier: FrameTier;
  highestBadge: { name: string; threshold: number } | null;
  reason: FeedReason;
  entityKind: "book" | "writer" | "translator" | "user" | "blog" | "store" | "club" | null;
  isQuote: boolean;
  targetLabel: string | null;
  targetHref: string | null;
  excerpt: string | null;
  /** Only set when entityKind is "book" - lets the feed card show a real
   * cover/typeset jacket thumbnail instead of reading as a plain text log,
   * the concrete difference between a notification list and something that
   * reads like an actual community feed. */
  bookCover: { id: number; hasImage: boolean; score: number } | null;
  /** Writer/translator comment/quote targets don't have a photo cover to
   * show, but still deserve more visual weight than plain text - the real
   * entity id lets the card render the same tone-colored EntityAvatar used
   * everywhere else on the site instead of nothing. */
  entityAvatarId: number | null;
  /** Set only for reason "comment" - lets the feed card offer a real like
   * button (reusing the same comment_like system EntityComments already
   * uses) instead of a static, non-interactive post, per the maintainer's
   * explicit ask for /akis to read as a genuine social/forum feed. */
  commentId: number | null;
  likeState: CommentLikeState | null;
  /** Set only for reason "feed_post" - the standalone status-update post's
   * own image (if any) and its independent like system (feed_post_like,
   * a separate table from comment_like since posts aren't comments). */
  feedPostId: number | null;
  feedPostImage: string | null;
  postLikeState: FeedPostLikeState | null;
  /** Real inline reply thread + composer target, for both "comment" posts
   * and standalone "feed_post" posts - the maintainer's explicit ask for a
   * genuine social-media feed, not just a link away to reply elsewhere. */
  replyTarget: { parentType: SubCommentParentType; parentId: number } | null;
  replies: CommentReply[];
}

function parseReasonKey(reason: string, reasonKey: string): { entityKind: FeedItem["entityKind"]; entityId: number | null } {
  const parts = reasonKey.split(":");
  switch (reason) {
    case "book_read":
      return { entityKind: "book", entityId: Number(parts[2]) || null };
    case "library_add":
      return { entityKind: "book", entityId: Number(parts[1]) || null };
    case "comment":
      return { entityKind: null, entityId: Number(parts[1]) || null }; // resolved via comment row
    case "rating":
    case "like": {
      const kind = parts[1];
      if (kind !== "book" && kind !== "writer" && kind !== "translator") return { entityKind: null, entityId: null };
      return { entityKind: kind, entityId: Number(parts[2]) || null };
    }
    case "follow":
      return { entityKind: "user", entityId: Number(parts[1]) || null };
    case "blog_published":
      return { entityKind: "blog", entityId: Number(parts[1]) || null };
    case "store_listing":
      return { entityKind: "store", entityId: Number(parts[1]) || null };
    case "author_post":
      return { entityKind: null, entityId: null }; // resolved via actor's own username
    case "club_join":
      return { entityKind: "club", entityId: Number(parts[parts.length - 1]) || null };
    case "feed_post":
      return { entityKind: null, entityId: Number(parts[1]) || null }; // resolved via feed_post row
    default:
      return { entityKind: null, entityId: null };
  }
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: number | null;
}

/**
 * Keyset-paginated (by point_transaction.id, never OFFSET) so "load more"
 * stays cheap regardless of how deep the feed goes - the same pagination
 * discipline already used everywhere else in this app for large tables.
 * Not wrapped in 'use cache': an activity feed is expected to read as
 * genuinely live, and each distinct cursor would otherwise mint its own
 * permanent cache entry for a page most viewers only see once.
 */
export async function getSiteFeed(opts: {
  limit?: number;
  cursor?: number | null;
  followingOnly?: boolean;
  viewerId?: number | null;
  /** "posts" (default) = comments/quotes/standalone posts only, the real
   * social-feed timeline. "activity" = everything else (reading status,
   * ratings, follows, library adds...), shown on its own separate tab. */
  mode?: "posts" | "activity";
}): Promise<FeedPage> {
  const limit = opts.limit ?? 25;
  const reasons = opts.mode === "activity" ? ACTIVITY_REASONS : POST_REASONS;
  const conditions = [inArray(pointTransaction.reason, reasons as unknown as string[])];
  if (opts.cursor) conditions.push(lt(pointTransaction.id, opts.cursor));

  if (opts.followingOnly) {
    if (!opts.viewerId) return { items: [], nextCursor: null };
    const followedRows = await db
      .select({ followedId: follow.followedId })
      .from(follow)
      .where(eq(follow.followerId, opts.viewerId));
    const followedIds = followedRows.map((r) => r.followedId);
    if (followedIds.length === 0) return { items: [], nextCursor: null };
    conditions.push(inArray(pointTransaction.userId, followedIds));
  }

  const rows = await db
    .select({
      id: pointTransaction.id,
      createdAt: pointTransaction.createdAt,
      reason: pointTransaction.reason,
      reasonKey: pointTransaction.reasonKey,
      actorId: user.id,
      actorUsername: user.username,
      actorImage: user.image,
    })
    .from(pointTransaction)
    .innerJoin(user, eq(pointTransaction.userId, user.id))
    .where(and(...conditions))
    .orderBy(desc(pointTransaction.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const parsed = page.map((r) => ({
    ...r,
    ...parseReasonKey(r.reason, r.reasonKey),
  }));

  const bookIds = new Set<number>();
  const writerIds = new Set<number>();
  const translatorIds = new Set<number>();
  const userIds = new Set<number>();
  const blogIds = new Set<number>();
  const storeIds = new Set<number>();
  const clubIds = new Set<number>();
  const commentIds = new Set<number>();
  const feedPostIds = new Set<number>();

  for (const r of parsed) {
    if (r.reason === "comment" && r.entityId) commentIds.add(r.entityId);
    else if (r.reason === "feed_post" && r.entityId) feedPostIds.add(r.entityId);
    else if (r.entityKind === "book" && r.entityId) bookIds.add(r.entityId);
    else if (r.entityKind === "writer" && r.entityId) writerIds.add(r.entityId);
    else if (r.entityKind === "translator" && r.entityId) translatorIds.add(r.entityId);
    else if (r.entityKind === "user" && r.entityId) userIds.add(r.entityId);
    else if (r.entityKind === "blog" && r.entityId) blogIds.add(r.entityId);
    else if (r.entityKind === "store" && r.entityId) storeIds.add(r.entityId);
    else if (r.entityKind === "club" && r.entityId) clubIds.add(r.entityId);
  }

  const commentRows = commentIds.size
    ? await db
        .select({ id: comment.id, comment: comment.comment, commentType: comment.commentType, type: comment.type, targetId: comment.targetId })
        .from(comment)
        .where(inArray(comment.id, [...commentIds]))
    : [];
  for (const c of commentRows) {
    const id = Number(c.targetId);
    if (c.type === "book") bookIds.add(id);
    else if (c.type === "writer") writerIds.add(id);
    else if (c.type === "translator") translatorIds.add(id);
  }
  const commentById = new Map(commentRows.map((c) => [c.id, c]));

  const feedPostRows = feedPostIds.size
    ? await db
        .select({ id: feedPost.id, text: feedPost.text, image: feedPost.image, bookId: feedPost.bookId })
        .from(feedPost)
        .where(inArray(feedPost.id, [...feedPostIds]))
    : [];
  const feedPostById = new Map(feedPostRows.map((p) => [p.id, p]));
  for (const p of feedPostRows) {
    if (p.bookId) bookIds.add(p.bookId);
  }

  const [
    bookRows,
    writerRows,
    translatorRows,
    userRows,
    blogRows,
    storeRows,
    clubRows,
    likeStates,
    postLikeStates,
    repliesByComment,
    repliesByPost,
    actorDecorations,
  ] = await Promise.all([
    bookIds.size
      ? db
          .select({ id: book.id, name: book.name, slug: book.slug, score: book.score, hasImage: sql<number>`(${book.image} is not null and ${book.image} != '')` })
          .from(book)
          .where(inArray(book.id, [...bookIds]))
      : Promise.resolve([]),
    writerIds.size ? db.select({ id: writer.id, name: writer.name, slug: writer.slug }).from(writer).where(inArray(writer.id, [...writerIds])) : Promise.resolve([]),
    translatorIds.size ? db.select({ id: translator.id, name: translator.name, slug: translator.slug }).from(translator).where(inArray(translator.id, [...translatorIds])) : Promise.resolve([]),
    userIds.size ? db.select({ id: user.id, username: user.username }).from(user).where(inArray(user.id, [...userIds])) : Promise.resolve([]),
    blogIds.size ? db.select({ id: blog.id, title: blog.title, slug: blog.slug }).from(blog).where(inArray(blog.id, [...blogIds])) : Promise.resolve([]),
    storeIds.size ? db.select({ id: store.id, title: store.title, slug: store.slug }).from(store).where(inArray(store.id, [...storeIds])) : Promise.resolve([]),
    clubIds.size ? db.select({ id: bookClub.id, name: bookClub.name, slug: bookClub.slug }).from(bookClub).where(inArray(bookClub.id, [...clubIds])) : Promise.resolve([]),
    getCommentLikeStates(opts.viewerId ?? null, [...commentIds]),
    getFeedPostLikeStates(opts.viewerId ?? null, [...feedPostIds]),
    getRepliesForComments([...commentIds]),
    getRepliesForPosts([...feedPostIds]),
    getUserDecorations(parsed.map((r) => r.actorId)),
  ]);

  const bookMap = new Map(bookRows.map((b) => [b.id, b]));
  const writerMap = new Map(writerRows.map((w) => [w.id, w]));
  const translatorMap = new Map(translatorRows.map((t) => [t.id, t]));
  const userMap = new Map(userRows.map((u) => [u.id, u]));
  const blogMap = new Map(blogRows.map((b) => [b.id, b]));
  const storeMap = new Map(storeRows.map((s) => [s.id, s]));
  const clubMap = new Map(clubRows.map((c) => [c.id, c]));

  const items: FeedItem[] = parsed.map((r): FeedItem => {
    const base = {
      id: r.id,
      createdAt: r.createdAt,
      actorId: r.actorId,
      actorUsername: r.actorUsername,
      actorImage: r.actorImage,
      ...decorationFor(actorDecorations, r.actorId),
      reason: r.reason as FeedReason,
      bookCover: null as FeedItem["bookCover"],
      entityAvatarId: null as FeedItem["entityAvatarId"],
      commentId: null as FeedItem["commentId"],
      likeState: null as FeedItem["likeState"],
      feedPostId: null as FeedItem["feedPostId"],
      feedPostImage: null as FeedItem["feedPostImage"],
      postLikeState: null as FeedItem["postLikeState"],
      replyTarget: null as FeedItem["replyTarget"],
      replies: [] as FeedItem["replies"],
    };

    if (r.reason === "feed_post" && r.entityId) {
      const p = feedPostById.get(r.entityId);
      if (!p) return { ...base, entityKind: null, isQuote: false, targetLabel: null, targetHref: null, excerpt: null };
      // Optional attached book ("kitapları ekleyebilecekleri") - reuses the
      // exact same cover/link rendering the comment branch below uses, so
      // no separate UI was needed for this.
      const attachedBook = p.bookId ? bookMap.get(p.bookId) : null;
      return {
        ...base,
        entityKind: attachedBook ? "book" : null,
        isQuote: false,
        targetLabel: attachedBook?.name ?? null,
        targetHref: attachedBook ? `/kitap/${attachedBook.slug}` : null,
        bookCover: attachedBook ? { id: attachedBook.id, hasImage: Boolean(attachedBook.hasImage), score: attachedBook.score } : null,
        excerpt: p.text,
        feedPostId: p.id,
        feedPostImage: p.image,
        postLikeState: postLikeStates[p.id] ?? { count: 0, liked: false, dislikeCount: 0, disliked: false },
        replyTarget: { parentType: "feedPost", parentId: p.id },
        replies: repliesByPost.get(p.id) ?? [],
      };
    }

    if (r.reason === "comment" && r.entityId) {
      const c = commentById.get(r.entityId);
      if (!c) return { ...base, entityKind: null, isQuote: false, targetLabel: null, targetHref: null, excerpt: null };
      base.commentId = c.id;
      base.likeState = likeStates[c.id] ?? { count: 0, liked: false, dislikeCount: 0, disliked: false };
      base.replyTarget = { parentType: "comment", parentId: c.id };
      base.replies = repliesByComment.get(c.id) ?? [];
      const isQuote = c.commentType === "quotation";
      // 400, not the old 140 - a forum-style feed post needs to actually
      // show real content, not a stub; matches v1's own Akış (which showed
      // up to 200 chars before a client-side "devamını gör" expand).
      const excerpt = c.comment.length > 400 ? `${c.comment.slice(0, 400)}...` : c.comment;
      if (c.type === "book") {
        const b = bookMap.get(Number(c.targetId));
        return {
          ...base,
          entityKind: "book",
          isQuote,
          targetLabel: b?.name ?? null,
          targetHref: b ? `/kitap/${b.slug}` : null,
          excerpt,
          bookCover: b ? { id: b.id, hasImage: Boolean(b.hasImage), score: b.score } : null,
        };
      }
      if (c.type === "writer") {
        const w = writerMap.get(Number(c.targetId));
        return { ...base, entityKind: "writer", isQuote, targetLabel: w?.name ?? null, targetHref: w ? `/yazar/${w.slug}` : null, excerpt, entityAvatarId: w?.id ?? null };
      }
      const t = translatorMap.get(Number(c.targetId));
      return { ...base, entityKind: "translator", isQuote, targetLabel: t?.name ?? null, targetHref: t ? `/cevirmen/${t.slug}` : null, excerpt, entityAvatarId: t?.id ?? null };
    }

    if ((r.reason === "book_read" || r.reason === "library_add" || (r.reason === "rating" && r.entityKind === "book") || (r.reason === "like" && r.entityKind === "book")) && r.entityId) {
      const b = bookMap.get(r.entityId);
      return {
        ...base,
        entityKind: "book",
        isQuote: false,
        targetLabel: b?.name ?? null,
        targetHref: b ? `/kitap/${b.slug}` : null,
        excerpt: null,
        bookCover: b ? { id: b.id, hasImage: Boolean(b.hasImage), score: b.score } : null,
      };
    }

    if ((r.reason === "rating" || r.reason === "like") && r.entityKind === "writer" && r.entityId) {
      const w = writerMap.get(r.entityId);
      return { ...base, entityKind: "writer", isQuote: false, targetLabel: w?.name ?? null, targetHref: w ? `/yazar/${w.slug}` : null, excerpt: null };
    }

    if ((r.reason === "rating" || r.reason === "like") && r.entityKind === "translator" && r.entityId) {
      const t = translatorMap.get(r.entityId);
      return { ...base, entityKind: "translator", isQuote: false, targetLabel: t?.name ?? null, targetHref: t ? `/cevirmen/${t.slug}` : null, excerpt: null };
    }

    if (r.reason === "follow" && r.entityId) {
      const u = userMap.get(r.entityId);
      return { ...base, entityKind: "user", isQuote: false, targetLabel: u?.username ?? null, targetHref: u ? `/profil/${u.username}` : null, excerpt: null };
    }

    if (r.reason === "blog_published" && r.entityId) {
      const bl = blogMap.get(r.entityId);
      return { ...base, entityKind: "blog", isQuote: false, targetLabel: bl?.title ?? null, targetHref: bl ? `/blog/${bl.slug}` : null, excerpt: null };
    }

    if (r.reason === "store_listing" && r.entityId) {
      const s = storeMap.get(r.entityId);
      return { ...base, entityKind: "store", isQuote: false, targetLabel: s?.title ?? null, targetHref: s ? `/askida-kitap/${s.slug}` : null, excerpt: null };
    }

    if (r.reason === "author_post") {
      return { ...base, entityKind: "user", isQuote: false, targetLabel: null, targetHref: `/yazarhane/${r.actorUsername}`, excerpt: null };
    }

    if (r.reason === "club_join" && r.entityId) {
      const c = clubMap.get(r.entityId);
      return { ...base, entityKind: "club", isQuote: false, targetLabel: c?.name ?? null, targetHref: c ? `/kulup/${c.slug}` : null, excerpt: null };
    }

    return { ...base, entityKind: null, isQuote: false, targetLabel: null, targetHref: null, excerpt: null };
  });

  // Rows whose target was deleted after the fact (book/comment/etc removed)
  // resolve to a null href - drop them from the rendered feed rather than
  // showing a broken/dead sentence.
  const visible = items.filter(
    (i) => i.targetHref !== null || i.reason === "author_post" || (i.reason === "feed_post" && i.feedPostId !== null),
  );

  return { items: visible, nextCursor: hasMore ? page[page.length - 1].id : null };
}
