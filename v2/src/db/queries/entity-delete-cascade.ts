import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { book, comment, commentLike, libraryBook, message, read, store, subComment } from "@/db/schema";
import type { CommentTargetType } from "@/db/queries/comments";

/**
 * Ports v1's real admin-delete comment cleanup (identical inline block
 * duplicated in BookController::delete/PublisherController::delete/
 * TranslatorController::delete/WriterController::delete): a comment on the
 * entity being deleted has no DB-level cascade to its sub_comment replies,
 * their own nested replies, or the top-level comment's likes (all three are
 * Doctrine app-layer `orphanRemoval`, not real FK ON DELETE clauses) - delete
 * bottom-up or MySQL rejects the whole chain with a FK violation.
 */
export async function deleteCommentTreeForTarget(targetType: CommentTargetType, targetId: number): Promise<void> {
  const comments = await db.select({ id: comment.id }).from(comment)
    .where(and(eq(comment.type, targetType), eq(comment.targetId, targetId)));
  if (comments.length === 0) return;
  const commentIds = comments.map((c) => c.id);

  const topReplies = await db.select({ id: subComment.id }).from(subComment)
    .where(and(eq(subComment.parentType, "comment"), inArray(subComment.parentId, commentIds)));
  if (topReplies.length > 0) {
    const topReplyIds = topReplies.map((r) => r.id);
    await db.delete(subComment).where(and(eq(subComment.parentType, "subComment"), inArray(subComment.parentId, topReplyIds)));
    await db.delete(subComment).where(inArray(subComment.id, topReplyIds));
  }

  await db.delete(commentLike).where(inArray(commentLike.commentId, commentIds));
  await db.delete(comment).where(inArray(comment.id, commentIds));
}

/**
 * Ports v1's real BookController::delete() cascade, PLUS closes two real
 * gaps found by checking the actual DB-level FK constraints (not just
 * reading the PHP): `library_book.book_id`, `read.book_id`, and
 * `message.referenced_book_id` have no ON DELETE clause at all in the real
 * schema (confirmed via drizzle-kit introspection), so a bare `book` row
 * delete would 1451 (FK violation) the moment any user had shelved/read the
 * book or shared it in a chat - v1's own controller never touches those
 * three tables before removing the book, which only doesn't surface as a
 * visible bug because... it would, the first time someone tried. Cleaning
 * them up here (delete library_book/read rows, null the message reference)
 * is a correctness fix, not scope creep - "her özellik her fonksiyon
 * çalışsın" requires the delete button not to throw.
 *
 * Also ports the real edition-parent reparenting v1's Book::delete() does:
 * if the book being removed IS a parent (no `originalBookId` of its own)
 * and has its own children, the first child becomes the new parent and the
 * rest re-point to it - otherwise those editions would silently lose their
 * link to each other. Unlike v1 (which only wires this into the single-book
 * delete endpoint, not the publisher-cascade one - a real latent gap:
 * deleting a publisher whose book had children under OTHER publishers left
 * those children's original_book_id pointing at a since-deleted row), this
 * is applied uniformly everywhere a book gets removed, since it's the same
 * primitive either way.
 */
export async function deleteBookCascade(bookId: number): Promise<void> {
  const [bookRow] = await db.select({ id: book.id, originalBookId: book.originalBookId }).from(book).where(eq(book.id, bookId)).limit(1);
  if (!bookRow) return;

  if (bookRow.originalBookId === null) {
    const children = await db.select({ id: book.id }).from(book).where(eq(book.originalBookId, bookId)).orderBy(book.id);
    if (children.length > 0) {
      const [newParent, ...rest] = children;
      await db.update(book).set({ originalBookId: null }).where(eq(book.id, newParent.id));
      if (rest.length > 0) {
        await db.update(book).set({ originalBookId: newParent.id }).where(inArray(book.id, rest.map((c) => c.id)));
      }
    }
  }

  await deleteCommentTreeForTarget("book", bookId);
  await db.update(store).set({ bookId: null }).where(eq(store.bookId, bookId));
  await db.delete(libraryBook).where(eq(libraryBook.bookId, bookId));
  await db.delete(read).where(eq(read.bookId, bookId));
  await db.update(message).set({ referencedBookId: null }).where(eq(message.referencedBookId, bookId));

  await db.delete(book).where(eq(book.id, bookId));
}
