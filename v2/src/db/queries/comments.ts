import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { comment, subComment, user } from "@/db/schema";
import { awardPointsWithDailyCap, getPointSettings } from "@/db/queries/points";
import { addNotification } from "@/db/queries/notifications";
import { autoFlagComment } from "@/db/queries/notices";
import { extractHashtagTags } from "@/lib/hashtag";
import { findFlaggedWords } from "@/lib/dirty-controller";

// v1's CommentTypeEnum - comments live on book/writer/translator pages, all
// through the same `comment` table (type + target_id columns).
export type CommentTargetType = "book" | "writer" | "translator";

// Customer's notes were explicit that "yorum yap" (write a review) and
// "alıntı yap" (add a quote) should read as clearly separate things, not
// blended into one generic "posts" feed like v1 did - commentType is the
// column that carries that distinction. Only "yorum" (review) is wired up
// in this pass; "alinti" (quote) reuses the same table/shape, a fast-follow.
export type CommentType = "yorum" | "alinti";

export interface SharedFromInfo {
  authorUsername: string;
  text: string;
}

export interface BookComment {
  id: number;
  text: string;
  date: string;
  authorUsername: string;
  sharedFrom: SharedFromInfo | null;
}

/**
 * Generic across book/writer/translator - v1's WriterController::getWriter()
 * nests comments/subComments on the writer page exactly like BookController::
 * getBook() does on the book page (same Comment/SubComment entities, just a
 * different `type`), so this isn't book-specific despite the historical name.
 */
export async function getEntityComments(
  targetId: number,
  targetType: CommentTargetType,
  commentType: CommentType = "yorum",
): Promise<BookComment[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`${targetType}-comments:${targetId}:${commentType}`);

  const rows = await db
    .select({
      id: comment.id,
      text: comment.comment,
      date: comment.date,
      authorUsername: user.username,
      sharedFromCommentId: comment.sharedFromCommentId,
    })
    .from(comment)
    .innerJoin(user, eq(comment.userId, user.id))
    .where(
      and(
        eq(comment.targetId, targetId),
        eq(comment.type, targetType),
        eq(comment.commentType, commentType),
        // v1's getBook()/getWriter() filter out comments from disabled/banned
        // users (checked per-comment in the PHP) - ported here rather than
        // left out, per the "don't skip v1 details" directive.
        eq(user.disable, 0),
      ),
    )
    .orderBy(desc(comment.id));

  const sharedFromById = await getSharedFromInfo(
    rows.map((r) => r.sharedFromCommentId).filter((id): id is number => id !== null),
  );

  return rows.map(({ sharedFromCommentId, ...r }) => ({
    ...r,
    sharedFrom: sharedFromCommentId !== null ? (sharedFromById.get(sharedFromCommentId) ?? null) : null,
  }));
}

/**
 * Customer's hashtag spec: writing "#username" in a comment/reply notifies
 * that real user they were "tagged as a reader" - Facebook-style mention,
 * layered on the plain color-coding `HashtagText` already renders. Only
 * tags matching a real, non-self username fire anything.
 */
async function notifyHashtaggedReaders(text: string, taggerUserId: number): Promise<void> {
  const tags = extractHashtagTags(text);
  if (tags.length === 0) return;

  const [tagger] = await db.select({ username: user.username }).from(user).where(eq(user.id, taggerUserId)).limit(1);
  if (!tagger) return;

  const matches = await db
    .select({ id: user.id })
    .from(user)
    .where(and(inArray(user.username, tags), ne(user.id, taggerUserId)));

  for (const match of matches) {
    await addNotification(
      match.id,
      taggerUserId,
      `" ${tagger.username} " sizi bir okur olarak etiketledi.`,
      `"${tagger.username}" tagged you as a reader.`,
    );
  }
}

async function getSharedFromInfo(commentIds: number[]): Promise<Map<number, SharedFromInfo>> {
  if (commentIds.length === 0) return new Map();

  const rows = await db
    .select({ id: comment.id, text: comment.comment, authorUsername: user.username })
    .from(comment)
    .innerJoin(user, eq(comment.userId, user.id))
    .where(inArray(comment.id, commentIds));

  return new Map(rows.map((r) => [r.id, { authorUsername: r.authorUsername, text: r.text }]));
}

/**
 * Customer's "share another user's review/quote to your own feed with your
 * own commentary" (Facebook share-with-caption style). Reuses the comment
 * table rather than a new "repost" entity - a share IS a new comment/quote,
 * same target and yorum/alıntı type as the original, just one that also
 * points back at what it was shared from. Commentary can be empty (a bare
 * share with no caption, same as Facebook allows) - the quoted original is
 * the content either way.
 */
export async function shareEntityComment(
  userId: number,
  originalCommentId: number,
  targetType: CommentTargetType,
  commentary: string,
): Promise<number> {
  const trimmed = commentary.trim();
  if (trimmed.length > 2000) {
    throw new Error("Yorum en fazla 2000 karakter olabilir.");
  }

  const [original] = await db
    .select({
      targetId: comment.targetId,
      type: comment.type,
      commentType: comment.commentType,
      userId: comment.userId,
    })
    .from(comment)
    .where(eq(comment.id, originalCommentId))
    .limit(1);

  if (!original || original.type !== targetType) {
    throw new Error("Paylaşılacak gönderi bulunamadı.");
  }

  const [result] = await db.insert(comment).values({
    userId,
    comment: trimmed,
    commentType: original.commentType,
    type: targetType,
    targetId: original.targetId,
    sharedFromCommentId: originalCommentId,
    date: new Date().toISOString().slice(0, 10),
  });

  updateTag(`${targetType}-comments:${original.targetId}:${original.commentType}`);
  if (targetType === "book") updateTag("recent-book-activity");
  {
    const settings = await getPointSettings();
    await awardPointsWithDailyCap(userId, settings.comment, "comment", `comment:${result.insertId}`, settings.dailyCommentCap);
  }
  if (trimmed) {
    await notifyHashtaggedReaders(trimmed, userId);
    await autoFlagComment(result.insertId, "comment", findFlaggedWords(trimmed));
  }

  if (original.userId !== userId) {
    const [sharer] = await db.select({ username: user.username }).from(user).where(eq(user.id, userId)).limit(1);
    if (sharer) {
      await addNotification(
        original.userId,
        userId,
        `" ${sharer.username} " gönderinizi kendi profiline paylaştı.`,
        `"${sharer.username}" shared your post.`,
      );
    }
  }

  return result.insertId;
}

export async function addEntityComment(
  userId: number,
  targetId: number,
  targetType: CommentTargetType,
  text: string,
  commentType: CommentType = "yorum",
): Promise<number> {
  const trimmed = text.trim();
  if (trimmed.length < 2) {
    throw new Error("Yorum en az 2 karakter olmalıdır.");
  }
  if (trimmed.length > 2000) {
    throw new Error("Yorum en fazla 2000 karakter olabilir.");
  }

  const [result] = await db.insert(comment).values({
    userId,
    comment: trimmed,
    commentType,
    type: targetType,
    targetId,
    date: new Date().toISOString().slice(0, 10),
  });

  updateTag(`${targetType}-comments:${targetId}:${commentType}`);
  if (targetType === "book") updateTag("recent-book-activity");
  {
    const settings = await getPointSettings();
    await awardPointsWithDailyCap(userId, settings.comment, "comment", `comment:${result.insertId}`, settings.dailyCommentCap);
  }
  await notifyHashtaggedReaders(trimmed, userId);
  await autoFlagComment(result.insertId, "comment", findFlaggedWords(trimmed));
  return result.insertId;
}

export async function getBookComments(
  bookId: number,
  commentType: CommentType = "yorum",
): Promise<BookComment[]> {
  return getEntityComments(bookId, "book", commentType);
}

export async function addBookComment(
  userId: number,
  bookId: number,
  text: string,
  commentType: CommentType = "yorum",
): Promise<number> {
  return addEntityComment(userId, bookId, "book", text, commentType);
}

export type SubCommentParentType = "comment" | "subComment";

export interface CommentReply {
  id: number;
  text: string;
  authorUsername: string;
  parentType: SubCommentParentType;
  parentId: number;
  replies: CommentReply[];
}

/**
 * v1's CommentController::getComments() unrolls exactly two reply levels
 * (subComment -> nested subComment) even though the sub_comment table's
 * generic parentType/parentId columns would technically allow deeper chains -
 * matched here rather than building true unbounded recursion, since that's
 * the depth the old UI ever actually rendered. Deliberately uncached (like
 * getReadStatus) - reply threads are small per book and need to reflect
 * writes immediately.
 */
export async function getRepliesForComments(
  commentIds: number[],
): Promise<Map<number, CommentReply[]>> {
  if (commentIds.length === 0) return new Map();

  const level1Rows = await db
    .select({
      id: subComment.id,
      text: subComment.comment,
      authorUsername: user.username,
      parentId: subComment.parentId,
    })
    .from(subComment)
    .innerJoin(user, eq(subComment.userId, user.id))
    .where(
      and(
        eq(subComment.parentType, "comment"),
        inArray(subComment.parentId, commentIds),
        eq(user.disable, 0),
      ),
    )
    .orderBy(subComment.id);

  const level1Ids = level1Rows.map((r) => r.id);

  const level2Rows = level1Ids.length
    ? await db
        .select({
          id: subComment.id,
          text: subComment.comment,
          authorUsername: user.username,
          parentId: subComment.parentId,
        })
        .from(subComment)
        .innerJoin(user, eq(subComment.userId, user.id))
        .where(
          and(
            eq(subComment.parentType, "subComment"),
            inArray(subComment.parentId, level1Ids),
            eq(user.disable, 0),
          ),
        )
        .orderBy(subComment.id)
    : [];

  const level2ByParent = new Map<number, CommentReply[]>();
  for (const row of level2Rows) {
    const list = level2ByParent.get(row.parentId) ?? [];
    list.push({ ...row, parentType: "subComment", replies: [] });
    level2ByParent.set(row.parentId, list);
  }

  const byComment = new Map<number, CommentReply[]>();
  for (const row of level1Rows) {
    const list = byComment.get(row.parentId) ?? [];
    list.push({
      ...row,
      parentType: "comment",
      replies: level2ByParent.get(row.id) ?? [],
    });
    byComment.set(row.parentId, list);
  }
  return byComment;
}

export async function addSubComment(
  userId: number,
  parentType: SubCommentParentType,
  parentId: number,
  text: string,
): Promise<number> {
  const trimmed = text.trim();
  if (trimmed.length < 2) {
    throw new Error("Yanıt en az 2 karakter olmalıdır.");
  }
  if (trimmed.length > 2000) {
    throw new Error("Yanıt en fazla 2000 karakter olabilir.");
  }

  const [result] = await db.insert(subComment).values({
    userId,
    comment: trimmed,
    parentType,
    parentId,
  });
  await notifyHashtaggedReaders(trimmed, userId);
  // The reply row itself always lives in `sub_comment`, regardless of
  // whether `parentType` (what it's replying TO) is "comment" or
  // "subComment" - so this is always the subComment case for flagging.
  await autoFlagComment(result.insertId, "subComment", findFlaggedWords(trimmed));
  return result.insertId;
}
