import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { readingList, readingListBook, book, user, writerBook, writer } from "@/db/schema";
import { isDuplicateKeyError } from "@/lib/db-errors";
import { slugify } from "@/lib/slugify";

/**
 * Kürasyonlu okuma listeleri (Letterboxd "Lists" style) - fifth item from
 * the "what else could be added" brainstorm list. Deliberately separate
 * from both "kitaplığım" (ownership) and reading-status (okudum/okuyorum)
 * - a list is a curated, shareable collection with its own title/
 * description, e.g. "Yılın en iyi 10 fantastik kitabı".
 */

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "liste";
  let candidate = root;
  let n = 1;
  while (true) {
    const [existing] = await db.select({ id: readingList.id }).from(readingList).where(eq(readingList.slug, candidate)).limit(1);
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

export interface CreateListInput {
  title: string;
  description?: string;
  isPublic?: boolean;
}

export async function createReadingList(ownerId: number, input: CreateListInput): Promise<{ id: number; slug: string }> {
  const title = input.title.trim();
  if (!title) throw new Error("Liste başlığı zorunludur.");

  const slug = await uniqueSlug(title);
  const [result] = await db.insert(readingList).values({
    ownerId,
    title,
    slug,
    description: input.description?.trim() || null,
    isPublic: input.isPublic === false ? 0 : 1,
    createdDate: nowSql(),
  });
  return { id: result.insertId, slug };
}

export async function updateReadingList(
  listId: number,
  ownerId: number,
  input: { title: string; description?: string; isPublic: boolean },
): Promise<void> {
  const [list] = await db.select({ ownerId: readingList.ownerId }).from(readingList).where(eq(readingList.id, listId)).limit(1);
  if (!list) throw new Error("Liste bulunamadı.");
  if (list.ownerId !== ownerId) throw new Error("Bu listeyi düzenleme yetkiniz yok.");

  const title = input.title.trim();
  if (!title) throw new Error("Liste başlığı zorunludur.");

  await db.update(readingList).set({
    title,
    description: input.description?.trim() || null,
    isPublic: input.isPublic ? 1 : 0,
  }).where(eq(readingList.id, listId));
}

export async function deleteReadingList(listId: number, ownerId: number): Promise<void> {
  const [list] = await db.select({ ownerId: readingList.ownerId }).from(readingList).where(eq(readingList.id, listId)).limit(1);
  if (!list) throw new Error("Liste bulunamadı.");
  if (list.ownerId !== ownerId) throw new Error("Bu listeyi silme yetkiniz yok.");

  await db.delete(readingListBook).where(eq(readingListBook.listId, listId));
  await db.delete(readingList).where(eq(readingList.id, listId));
}

export async function addBookToList(listId: number, ownerId: number, bookId: number): Promise<void> {
  const [list] = await db.select({ ownerId: readingList.ownerId }).from(readingList).where(eq(readingList.id, listId)).limit(1);
  if (!list) throw new Error("Liste bulunamadı.");
  if (list.ownerId !== ownerId) throw new Error("Bu listeye ekleme yetkiniz yok.");

  const [maxRow] = await db.select({ max: sql<number>`coalesce(max(${readingListBook.sortOrder}), -1)` }).from(readingListBook).where(eq(readingListBook.listId, listId));
  const nextSort = Number(maxRow?.max ?? -1) + 1;

  try {
    await db.insert(readingListBook).values({ listId, bookId, sortOrder: nextSort, addedAt: nowSql() });
  } catch (err) {
    if (isDuplicateKeyError(err, "uniq_reading_list_book")) return; // already in the list, not an error
    throw err;
  }
}

export async function removeBookFromList(listId: number, ownerId: number, bookId: number): Promise<void> {
  const [list] = await db.select({ ownerId: readingList.ownerId }).from(readingList).where(eq(readingList.id, listId)).limit(1);
  if (!list) throw new Error("Liste bulunamadı.");
  if (list.ownerId !== ownerId) throw new Error("Bu listeden çıkarma yetkiniz yok.");

  await db.delete(readingListBook).where(and(eq(readingListBook.listId, listId), eq(readingListBook.bookId, bookId)));
}

export interface UserListSummary {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  bookCount: number;
}

export async function getUserLists(ownerId: number): Promise<UserListSummary[]> {
  const rows = await db
    .select({
      id: readingList.id,
      title: readingList.title,
      slug: readingList.slug,
      description: readingList.description,
      isPublic: readingList.isPublic,
      bookCount: sql<number>`count(${readingListBook.id})`,
    })
    .from(readingList)
    .leftJoin(readingListBook, eq(readingListBook.listId, readingList.id))
    .where(eq(readingList.ownerId, ownerId))
    .groupBy(readingList.id, readingList.title, readingList.slug, readingList.description, readingList.isPublic)
    .orderBy(desc(readingList.id));

  return rows.map((r) => ({ ...r, isPublic: r.isPublic === 1, bookCount: Number(r.bookCount) }));
}

/** Discovery feed - every public list, newest first (a small catalog like
 * this doesn't need pagination yet). */
export async function getPublicLists(limit = 40): Promise<(UserListSummary & { ownerUsername: string })[]> {
  const rows = await db
    .select({
      id: readingList.id,
      title: readingList.title,
      slug: readingList.slug,
      description: readingList.description,
      isPublic: readingList.isPublic,
      ownerUsername: user.username,
      bookCount: sql<number>`count(${readingListBook.id})`,
    })
    .from(readingList)
    .innerJoin(user, eq(readingList.ownerId, user.id))
    .leftJoin(readingListBook, eq(readingListBook.listId, readingList.id))
    .where(eq(readingList.isPublic, 1))
    .groupBy(readingList.id, readingList.title, readingList.slug, readingList.description, readingList.isPublic, user.username)
    .orderBy(desc(readingList.id))
    .limit(limit);

  return rows.map((r) => ({ ...r, isPublic: true, bookCount: Number(r.bookCount) }));
}

export interface ListBookItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  writers: string[];
}

export interface ListDetail {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  ownerId: number;
  ownerUsername: string;
  books: ListBookItem[];
}

export async function getListBySlug(slug: string): Promise<ListDetail | null> {
  const [list] = await db
    .select({
      id: readingList.id,
      title: readingList.title,
      slug: readingList.slug,
      description: readingList.description,
      isPublic: readingList.isPublic,
      ownerId: readingList.ownerId,
      ownerUsername: user.username,
    })
    .from(readingList)
    .innerJoin(user, eq(readingList.ownerId, user.id))
    .where(eq(readingList.slug, slug))
    .limit(1);

  if (!list) return null;

  const bookRows = await db
    .select({ id: book.id, name: book.name, slug: book.slug, score: book.score })
    .from(readingListBook)
    .innerJoin(book, eq(readingListBook.bookId, book.id))
    .where(eq(readingListBook.listId, list.id))
    .orderBy(readingListBook.sortOrder);

  const bookIds = bookRows.map((b) => b.id);
  const writerRows = bookIds.length
    ? await db
        .select({ bookId: writerBook.bookId, name: writer.name })
        .from(writerBook)
        .innerJoin(writer, eq(writerBook.writerId, writer.id))
        .where(inArray(writerBook.bookId, bookIds))
    : [];
  const writersByBook = new Map<number, string[]>();
  for (const w of writerRows) {
    if (!writersByBook.has(w.bookId)) writersByBook.set(w.bookId, []);
    writersByBook.get(w.bookId)!.push(w.name);
  }

  return {
    ...list,
    isPublic: list.isPublic === 1,
    books: bookRows.map((b) => ({ ...b, writers: writersByBook.get(b.id) ?? [] })),
  };
}
