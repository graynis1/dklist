import "server-only";
import { updateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { score, book, writer, translator } from "@/db/schema";
import { awardPointsWithDailyCap, getPointSettings } from "@/db/queries/points";

const BOOK_TARGET_TYPE = "book";
const WRITER_TARGET_TYPE = "writer";
const TRANSLATOR_TARGET_TYPE = "translator";

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
 * Upserts the caller's 1-10 rating for a book (UNIQUE(owner_id, target_id,
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
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new Error("Puan 1 ile 10 arasında bir tam sayı olmalıdır.");
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
  {
    const settings = await getPointSettings();
    await awardPointsWithDailyCap(userId, settings.rating, "rating", `rating:book:${bookId}`, settings.dailyRatingCap);
  }

  return { newAverage };
}

/**
 * v1's ScoreEnum::Writer/Translator - the same Score-table rating system as
 * books, just against writer/translator rows instead. v1's WriterController::
 * getWriter() always recomputes the average live from `score` rather than
 * trusting the writer's own denormalized `score` column for the detail page
 * response (only the paginated list view reads the stored column directly) -
 * matched here: rateWriter/rateTranslator update the denormalized column for
 * cheap list/sort reads, same as rateBook does for `book.score`.
 */
export async function getUserWriterRating(userId: number, writerId: number): Promise<number | null> {
  const [row] = await db
    .select({ score: score.score })
    .from(score)
    .where(
      and(eq(score.ownerId, userId), eq(score.targetId, writerId), eq(score.targetType, WRITER_TARGET_TYPE)),
    )
    .limit(1);
  return row?.score ?? null;
}

export async function rateWriter(
  userId: number,
  writerId: number,
  value: number,
  writerSlug: string,
): Promise<{ newAverage: number }> {
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new Error("Puan 1 ile 10 arasında bir tam sayı olmalıdır.");
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(score)
      .values({ ownerId: userId, targetId: writerId, targetType: WRITER_TARGET_TYPE, score: value })
      .onDuplicateKeyUpdate({ set: { score: value } });

    const [{ avg }] = await tx
      .select({ avg: sql<number>`avg(${score.score})` })
      .from(score)
      .where(and(eq(score.targetId, writerId), eq(score.targetType, WRITER_TARGET_TYPE)));

    await tx.update(writer).set({ score: avg }).where(eq(writer.id, writerId));
  });

  const [{ avg: newAverage }] = await db
    .select({ avg: sql<number>`avg(${score.score})` })
    .from(score)
    .where(and(eq(score.targetId, writerId), eq(score.targetType, WRITER_TARGET_TYPE)));

  updateTag(`writer:${writerSlug}`);
  {
    const settings = await getPointSettings();
    await awardPointsWithDailyCap(userId, settings.rating, "rating", `rating:writer:${writerId}`, settings.dailyRatingCap);
  }
  return { newAverage };
}

export async function getUserTranslatorRating(
  userId: number,
  translatorId: number,
): Promise<number | null> {
  const [row] = await db
    .select({ score: score.score })
    .from(score)
    .where(
      and(
        eq(score.ownerId, userId),
        eq(score.targetId, translatorId),
        eq(score.targetType, TRANSLATOR_TARGET_TYPE),
      ),
    )
    .limit(1);
  return row?.score ?? null;
}

export async function rateTranslator(
  userId: number,
  translatorId: number,
  value: number,
  translatorSlug: string,
): Promise<{ newAverage: number }> {
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new Error("Puan 1 ile 10 arasında bir tam sayı olmalıdır.");
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(score)
      .values({ ownerId: userId, targetId: translatorId, targetType: TRANSLATOR_TARGET_TYPE, score: value })
      .onDuplicateKeyUpdate({ set: { score: value } });

    const [{ avg }] = await tx
      .select({ avg: sql<number>`avg(${score.score})` })
      .from(score)
      .where(and(eq(score.targetId, translatorId), eq(score.targetType, TRANSLATOR_TARGET_TYPE)));

    await tx.update(translator).set({ score: avg }).where(eq(translator.id, translatorId));
  });

  const [{ avg: newAverage }] = await db
    .select({ avg: sql<number>`avg(${score.score})` })
    .from(score)
    .where(and(eq(score.targetId, translatorId), eq(score.targetType, TRANSLATOR_TARGET_TYPE)));

  updateTag(`translator:${translatorSlug}`);
  {
    const settings = await getPointSettings();
    await awardPointsWithDailyCap(userId, settings.rating, "rating", `rating:translator:${translatorId}`, settings.dailyRatingCap);
  }
  return { newAverage };
}

/** Real rating count for a book - `score` has a UNIQUE(owner_id, target_id,
 * target_type) constraint, so this is exactly "how many distinct people
 * rated it", not an estimate. Used for the book page's schema.org
 * AggregateRating - Google's structured-data guidelines want a real count,
 * not a placeholder. */
export async function getBookRatingCount(bookId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(score)
    .where(and(eq(score.targetId, bookId), eq(score.targetType, BOOK_TARGET_TYPE)));
  return Number(row?.count ?? 0);
}

/** Same as getBookRatingCount(), for writer/translator pages - customer's
 * explicit ask ("puanların yanında kaç kişi oy kullandı verisi
 * eklenebilir mi") applied everywhere a score is shown, not just books. */
export async function getWriterRatingCount(writerId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(score)
    .where(and(eq(score.targetId, writerId), eq(score.targetType, WRITER_TARGET_TYPE)));
  return Number(row?.count ?? 0);
}

export async function getTranslatorRatingCount(translatorId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(score)
    .where(and(eq(score.targetId, translatorId), eq(score.targetType, TRANSLATOR_TARGET_TYPE)));
  return Number(row?.count ?? 0);
}
