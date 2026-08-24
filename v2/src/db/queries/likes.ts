import "server-only";
import { updateTag, cacheTag, cacheLife } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { userBook, userWriter, userTranslator, userPublisher, writer, translator, publisher } from "@/db/schema";
import { awardPoints, getPointSettings } from "@/db/queries/points";

/**
 * "Beğen" (like) - v1's User::$likedBooks / Book::$users ManyToMany, backed
 * by the `user_book` table. Genuinely distinct from three other things this
 * session already built, easy to conflate but each is a separate v1 concept:
 * rating (1-5 stars, `score` table), reading status (`read` table), and
 * ownership/kitaplığım (`library_book` table). Found by reading
 * BookController::getBook()'s `currentUserIsLiked` field directly - not
 * something the schema alone made obvious, since `user_book` doesn't name
 * its purpose the way `library_book` does.
 */
export async function isBookLiked(userId: number, bookId: number): Promise<boolean> {
  const [row] = await db
    .select({ bookId: userBook.bookId })
    .from(userBook)
    .where(and(eq(userBook.userId, userId), eq(userBook.bookId, bookId)))
    .limit(1);
  return Boolean(row);
}

export async function getBookLikeCount(bookId: number): Promise<number> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`book-like-count:${bookId}`);

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(userBook)
    .where(eq(userBook.bookId, bookId));
  return n;
}

export async function toggleBookLike(
  userId: number,
  bookId: number,
): Promise<{ liked: boolean }> {
  const already = await isBookLiked(userId, bookId);
  if (already) {
    await db
      .delete(userBook)
      .where(and(eq(userBook.userId, userId), eq(userBook.bookId, bookId)));
  } else {
    await db.insert(userBook).values({ userId, bookId });
    await awardPoints(userId, (await getPointSettings()).like, "like", `like:book:${bookId}`);
  }
  updateTag(`book-like-count:${bookId}`);
  return { liked: !already };
}

/**
 * v1's User::$likedWriters/$likedTranslators (ManyToMany, User::unlike() +
 * the reverse add via the writer/translator "beğen" button) - the same Like
 * concept as book likes, on the user_writer/user_translator join tables.
 * Deliberately generic over "writer"|"translator" rather than duplicating
 * isBookLiked/toggleBookLike a second and third time.
 */
export async function isWriterLiked(userId: number, writerId: number): Promise<boolean> {
  const [row] = await db
    .select({ writerId: userWriter.writerId })
    .from(userWriter)
    .where(and(eq(userWriter.userId, userId), eq(userWriter.writerId, writerId)))
    .limit(1);
  return Boolean(row);
}

export async function getWriterLikeCount(writerId: number): Promise<number> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`writer-like-count:${writerId}`);

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(userWriter)
    .where(eq(userWriter.writerId, writerId));
  return n;
}

export async function toggleWriterLike(
  userId: number,
  writerId: number,
): Promise<{ liked: boolean }> {
  const already = await isWriterLiked(userId, writerId);
  if (already) {
    await db
      .delete(userWriter)
      .where(and(eq(userWriter.userId, userId), eq(userWriter.writerId, writerId)));
  } else {
    await db.insert(userWriter).values({ userId, writerId });
    await awardPoints(userId, (await getPointSettings()).like, "like", `like:writer:${writerId}`);
  }
  updateTag(`writer-like-count:${writerId}`);
  updateTag(`liked-writers:${userId}`);
  return { liked: !already };
}

export async function isTranslatorLiked(userId: number, translatorId: number): Promise<boolean> {
  const [row] = await db
    .select({ translatorId: userTranslator.translatorId })
    .from(userTranslator)
    .where(and(eq(userTranslator.userId, userId), eq(userTranslator.translatorId, translatorId)))
    .limit(1);
  return Boolean(row);
}

export async function getTranslatorLikeCount(translatorId: number): Promise<number> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`translator-like-count:${translatorId}`);

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(userTranslator)
    .where(eq(userTranslator.translatorId, translatorId));
  return n;
}

export async function toggleTranslatorLike(
  userId: number,
  translatorId: number,
): Promise<{ liked: boolean }> {
  const already = await isTranslatorLiked(userId, translatorId);
  if (already) {
    await db
      .delete(userTranslator)
      .where(and(eq(userTranslator.userId, userId), eq(userTranslator.translatorId, translatorId)));
  } else {
    await db.insert(userTranslator).values({ userId, translatorId });
    await awardPoints(userId, (await getPointSettings()).like, "like", `like:translator:${translatorId}`);
  }
  updateTag(`translator-like-count:${translatorId}`);
  updateTag(`liked-translators:${userId}`);
  return { liked: !already };
}

/**
 * Publisher "Takip Et" - unlike book/writer/translator Like, this has no v1
 * equivalent at all (PublisherController has no rating/comment/like system,
 * confirmed by reading it in full). The button existed in the page from
 * early scaffolding with no onClick - a real dead-UI gap flagged during a
 * "buttons don't work" audit. Wired to the same Like mechanism as
 * writer/translator rather than left removed, since a follow-a-publisher
 * action is a reasonable, cheap real feature to back it with.
 */
export async function isPublisherLiked(userId: number, publisherId: number): Promise<boolean> {
  const [row] = await db
    .select({ publisherId: userPublisher.publisherId })
    .from(userPublisher)
    .where(and(eq(userPublisher.userId, userId), eq(userPublisher.publisherId, publisherId)))
    .limit(1);
  return Boolean(row);
}

export async function getPublisherLikeCount(publisherId: number): Promise<number> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`publisher-like-count:${publisherId}`);

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(userPublisher)
    .where(eq(userPublisher.publisherId, publisherId));
  return n;
}

export async function togglePublisherLike(
  userId: number,
  publisherId: number,
): Promise<{ liked: boolean }> {
  const already = await isPublisherLiked(userId, publisherId);
  if (already) {
    await db
      .delete(userPublisher)
      .where(and(eq(userPublisher.userId, userId), eq(userPublisher.publisherId, publisherId)));
  } else {
    await db.insert(userPublisher).values({ userId, publisherId });
    await awardPoints(userId, (await getPointSettings()).like, "like", `like:publisher:${publisherId}`);
  }
  updateTag(`publisher-like-count:${publisherId}`);
  updateTag(`liked-publishers:${userId}`);
  return { liked: !already };
}

export async function getLikedPublishers(userId: number): Promise<LikedEntity[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`liked-publishers:${userId}`);

  return db
    .select({ id: publisher.id, name: publisher.name, slug: publisher.slug })
    .from(userPublisher)
    .innerJoin(publisher, eq(userPublisher.publisherId, publisher.id))
    .where(eq(userPublisher.userId, userId));
}

export interface LikedEntity {
  id: number;
  name: string;
  slug: string;
}

export async function getLikedWriters(userId: number): Promise<LikedEntity[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`liked-writers:${userId}`);

  return db
    .select({ id: writer.id, name: writer.name, slug: writer.slug })
    .from(userWriter)
    .innerJoin(writer, eq(userWriter.writerId, writer.id))
    .where(eq(userWriter.userId, userId));
}

export async function getLikedTranslators(userId: number): Promise<LikedEntity[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`liked-translators:${userId}`);

  return db
    .select({ id: translator.id, name: translator.name, slug: translator.slug })
    .from(userTranslator)
    .innerJoin(translator, eq(userTranslator.translatorId, translator.id))
    .where(eq(userTranslator.userId, userId));
}
