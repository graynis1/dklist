import "server-only";
import { updateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { score, book } from "@/db/schema";

const BOOK_TARGET_TYPE = "book";

export async function getUserBookRating(
  userId: number,
  bookId: number,
): Promise<number | null> {
  const [row] = await db
    .select({ score: score.score })
    .from(score)
    .where(
      and(
        eq(score.ownerId, userId),
        eq(score.targetId, bookId),
        eq(score.targetType, BOOK_TARGET_TYPE),
      ),
    )
    .limit(1);
  return row?.score ?? null;
}

/**
 * Upserts the caller's 1-5 rating for a book (UNIQUE(owner_id, target_id,
 * target_type) from migration 0003 makes this a real upsert, not a pile of
 * duplicate votes), then recomputes `book.score` as the mean of all votes
 * for that book. `book.score` is a materialized/cached aggregate, same
 * pattern v1 used - individual votes live in `score`, the book row carries
 * a denormalized average so listing/sort queries (idx_book_score) don't
 * need to aggregate `score` on every read.
 */
export async function rateBook(
  userId: number,
  bookId: number,
  value: number,
  // getBookBySlug caches under `book:${slug}`, not `book:${id}` - needed here
  // purely so the invalidation tag actually matches. Found by re-reading
  // book-detail.ts rather than assuming the tag shape; would have been a
  // silent no-op cache-invalidation bug otherwise, same class of mistake as
  // the revalidateTag/updateTag one earlier in this session.
  bookSlug: string,
): Promise<{ newAverage: number }> {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error("Puan 1 ile 5 arasında bir tam sayı olmalıdır.");
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(score)
      .values({ ownerId: userId, targetId: bookId, targetType: BOOK_TARGET_TYPE, score: value })
      .onDuplicateKeyUpdate({ set: { score: value } });

    const [{ avg }] = await tx
      .select({ avg: sql<number>`avg(${score.score})` })
      .from(score)
      .where(and(eq(score.targetId, bookId), eq(score.targetType, BOOK_TARGET_TYPE)));

    await tx.update(book).set({ score: avg }).where(eq(book.id, bookId));
  });

  const [{ avg: newAverage }] = await db
    .select({ avg: sql<number>`avg(${score.score})` })
    .from(score)
    .where(and(eq(score.targetId, bookId), eq(score.targetType, BOOK_TARGET_TYPE)));

  updateTag(`book:${bookSlug}`);
  updateTag(`book-rating:${bookId}`);

  return { newAverage };
}
