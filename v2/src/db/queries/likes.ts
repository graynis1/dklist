import "server-only";
import { updateTag, cacheTag, cacheLife } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { userBook } from "@/db/schema";

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
  }
  updateTag(`book-like-count:${bookId}`);
  return { liked: !already };
}
