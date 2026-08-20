import "server-only";
import { updateTag } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { libraryBook } from "@/db/schema";

/**
 * "Kitaplığım" (ownership) - deliberately separate from reading status
 * (src/db/queries/reading-status.ts). The customer's notes described these
 * as conflated in v1's UI ("kitaplığımdaki kitaplar okunmuş gibi
 * algılanmamalı... kitaplıktan çıkarılabilmeli"), but the underlying schema
 * (`library_book`) was already its own table separate from `read` - so this
 * is a UI-only feature addition, not a schema fix.
 */
export async function isInLibrary(ownerId: number, bookId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: libraryBook.id })
    .from(libraryBook)
    .where(and(eq(libraryBook.ownerId, ownerId), eq(libraryBook.bookId, bookId)))
    .limit(1);
  return Boolean(row);
}

export async function toggleLibrary(
  ownerId: number,
  bookId: number,
): Promise<{ inLibrary: boolean }> {
  const already = await isInLibrary(ownerId, bookId);
  if (already) {
    await db
      .delete(libraryBook)
      .where(and(eq(libraryBook.ownerId, ownerId), eq(libraryBook.bookId, bookId)));
  } else {
    await db.insert(libraryBook).values({ ownerId, bookId });
  }
  // isInLibrary itself is deliberately not cached (cheap indexed lookup read
  // right after this write), but the profile page's getLibraryBooks() IS
  // cached - that one needs the explicit invalidation.
  updateTag(`library-books:${ownerId}`);
  return { inLibrary: !already };
}
