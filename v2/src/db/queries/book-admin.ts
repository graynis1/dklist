import "server-only";
import { updateTag } from "next/cache";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { book, publisher, writer, writerBook, category, bookCategory, translator, translatorBook } from "@/db/schema";
import { isDirty } from "@/lib/dirty-controller";
import { AUTO_APPROVE_ROLES, type UserType } from "@/lib/permission";
import { deleteBookCascade } from "@/db/queries/entity-delete-cascade";
import { userWriter } from "@/db/schema";
import { addNotification } from "@/db/queries/notifications";
import { resolveSystemSenderId } from "@/db/queries/points";
import { computeAndStoreBookEmbedding } from "@/db/queries/book-embedding";

function slugify(input: string): string {
  // Turkish-character map must run BEFORE toLowerCase(), not after: JS's
  // locale-insensitive toLowerCase() turns capital İ (U+0130) into "i" plus
  // a combining dot above (U+0307), not the plain "i" this map expects to
  // replace it with - by the time toLowerCase() ran first, "İ" no longer
  // existed in the string for this regex to match, and the stray combining
  // character got swallowed into a spurious extra hyphen instead (a real
  // bug, caught via testing: "İletişim Yayınları" produced
  // "i-letisim-yayinlari" - note the wrong break after the first "i").
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i", Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u" };
  return input
    .replace(/[çğıöşüİÇĞÖŞÜ]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface CreateBookInput {
  name: string;
  orgName: string;
  publisherId: number;
  lang: string;
  pageNumber: number;
  format?: string;
  isbn?: string;
  content?: string;
  /** 0/undefined = a new original work; a real book id = a new edition/
   * translation of that existing book, matching v1's real `parentID`
   * semantics (BookController::add()). */
  parentId?: number;
  writerIds?: number[];
  translatorIds?: number[];
  categoryIds?: number[];
}

/**
 * Customer's "eksik kitap bildir bottleneck" fix: currently only Admin/Mod
 * can add book data (v1's real `BookController::add()`, confirmed via
 * source - permission list is `[Mod, Admin]`, SuperAdmin always passes).
 * Extends that to the new Yazar/Yayinevi member roles too, per the
 * customer's explicit ask - their submissions land pending (book.approve=0,
 * the column already existed in the frozen schema, just never wired to a
 * v2 submission flow), Admin/Mod("Kütüphaneci")'s own submissions still
 * auto-approve exactly like v1's `add()` already does.
 *
 * Ports v1's real correctness details rather than a bare insert: the
 * profanity filter (DirtyController, admin-add-flow-only per its own
 * comment), the edition/translation duplicate check (same parent + same
 * publisher + identical translator set already exists → reject), and
 * category inheritance from the parent book when this is an edition/
 * translation rather than a brand-new original work.
 */
export async function createBookSubmission(
  actorUserId: number,
  actorRole: UserType,
  input: CreateBookInput,
): Promise<{ id: number; slug: string; approved: boolean }> {
  const name = input.name.trim();
  const orgName = input.orgName.trim();
  const content = input.content?.trim() ?? "";

  if (isDirty(name) || isDirty(orgName) || isDirty(content)) {
    throw new Error("Hakaret içeren içerik ekleyemezsiniz.");
  }
  if (!name || !orgName || !input.publisherId || !input.lang || !input.pageNumber) {
    throw new Error("Kitap adı, orijinal ad, yayınevi, sayfa sayısı ve dil zorunludur.");
  }

  const [publisherRow] = await db
    .select({ id: publisher.id, name: publisher.name })
    .from(publisher)
    .where(eq(publisher.id, input.publisherId))
    .limit(1);
  if (!publisherRow) {
    throw new Error("Kitabın yayınevi tanımlı değil.");
  }

  let categoryIds = input.categoryIds ?? [];
  const parentId = input.parentId && input.parentId > 0 ? input.parentId : null;

  if (parentId) {
    const [parentRow] = await db.select({ id: book.id }).from(book).where(eq(book.id, parentId)).limit(1);
    if (!parentRow) {
      throw new Error("Belirtilen orijinal kitap bulunamadı.");
    }

    // Same duplicate-translation check as v1's real add(): same parent +
    // same publisher + identical translator set already exists.
    const [existingEdition] = await db
      .select({ id: book.id })
      .from(book)
      .where(and(eq(book.originalBookId, parentId), eq(book.publisherId, input.publisherId)))
      .limit(1);
    if (existingEdition) {
      const existingTranslatorRows = await db
        .select({ translatorId: translatorBook.translatorId })
        .from(translatorBook)
        .where(eq(translatorBook.bookId, existingEdition.id));
      const existingSet = new Set(existingTranslatorRows.map((r) => r.translatorId));
      const newSet = new Set(input.translatorIds ?? []);
      if (existingSet.size === newSet.size && [...existingSet].every((id) => newSet.has(id))) {
        throw new Error("Bu kitap çevirisi zaten ekli.");
      }
    }

    // Categories are inherited from the parent, not chosen independently -
    // matches v1's real add() exactly.
    const parentCategoryRows = await db
      .select({ categoryId: bookCategory.categoryId })
      .from(bookCategory)
      .where(eq(bookCategory.bookId, parentId));
    categoryIds = parentCategoryRows.map((r) => r.categoryId);
  }

  const approved = AUTO_APPROVE_ROLES.includes(actorRole);
  const slug = `${slugify(publisherRow.name)}-${slugify(name)}`.slice(0, 250);

  const [result] = await db.insert(book).values({
    publisherId: input.publisherId,
    originalBookId: parentId,
    name,
    orgName,
    lang: input.lang,
    pageNumber: input.pageNumber,
    format: input.format?.trim() || null,
    isbn: input.isbn?.trim() || null,
    content: content || null,
    slug,
    score: 0,
    viewCount: 0,
    approve: approved ? 1 : 0,
  });

  const bookId = result.insertId;

  const writerIds = input.writerIds ?? [];
  if (writerIds.length > 0) {
    await db.insert(writerBook).values(writerIds.map((writerId) => ({ writerId, bookId })));
  }
  const translatorIds = input.translatorIds ?? [];
  if (translatorIds.length > 0) {
    await db.insert(translatorBook).values(translatorIds.map((translatorId) => ({ translatorId, bookId })));
  }
  if (categoryIds.length > 0) {
    await db.insert(bookCategory).values(categoryIds.map((categoryId) => ({ bookId, categoryId })));
  }

  updateTag("pending-book-submissions");
  if (approved) {
    updateTag("latest-books");
    if (writerIds.length > 0) await notifyWriterLikersOfNewBook(writerIds, name);
  }

  // Fire-and-forget - the model can take a few seconds to warm up on first
  // use, and a book submission shouldn't block on that. Safe here because
  // this app runs as a long-lived process (next start), not a serverless
  // function that could be torn down mid-promise.
  void computeAndStoreBookEmbedding(bookId, name, orgName, content || null);

  return { id: bookId, slug, approved };
}

/** Customer wishlist item: users who liked a writer get told when that
 * writer has a new book out, rather than having to keep re-checking the
 * writer's page. Only fires once the book is actually live (approve=1) -
 * called from both the auto-approve path above and approveBookSubmission
 * below, never from a still-pending submission. */
async function notifyWriterLikersOfNewBook(writerIds: number[], bookName: string): Promise<void> {
  const likerRows = await db
    .select({ userId: userWriter.userId, writerName: writer.name })
    .from(userWriter)
    .innerJoin(writer, eq(userWriter.writerId, writer.id))
    .where(inArray(userWriter.writerId, writerIds));

  if (likerRows.length === 0) return;

  const senderId = await resolveSystemSenderId();
  if (!senderId) return;

  const writerNamesByUser = new Map<number, string[]>();
  for (const row of likerRows) {
    const list = writerNamesByUser.get(row.userId) ?? [];
    list.push(row.writerName);
    writerNamesByUser.set(row.userId, list);
  }

  for (const [userId, writerNames] of writerNamesByUser) {
    const names = [...new Set(writerNames)].join(", ");
    await addNotification(
      userId,
      senderId,
      `Beğendiğin yazar ${names}'in yeni kitabı: "${bookName}".`,
      `A writer you liked (${names}) has a new book: "${bookName}".`,
    );
  }
}

export interface PendingBookSubmission {
  id: number;
  name: string;
  orgName: string;
  slug: string;
  publisherName: string;
  writers: string[];
}

/** Approval queue for Yazar/Yayinevi submissions - Kütüphaneci("Mod")/Admin/
 * SuperAdmin gated (see requireRole call site), matching the customer's
 * "Kütüphaneci can enter data AND approve additions from the roles above"
 * spec. Deliberately uncached - a real moderation queue needs to reflect
 * the latest submissions immediately, same reasoning as the blog and
 * report-queue admin pages already built this session. */
export async function getPendingBookSubmissions(): Promise<PendingBookSubmission[]> {
  const rows = await db
    .select({
      id: book.id,
      name: book.name,
      orgName: book.orgName,
      slug: book.slug,
      publisherName: publisher.name,
    })
    .from(book)
    .innerJoin(publisher, eq(book.publisherId, publisher.id))
    .where(eq(book.approve, 0))
    .orderBy(desc(book.id));

  if (rows.length === 0) return [];

  const bookIds = rows.map((r) => r.id);
  const writerRows = await db
    .select({ bookId: writerBook.bookId, name: writer.name })
    .from(writerBook)
    .innerJoin(writer, eq(writerBook.writerId, writer.id))
    .where(inArray(writerBook.bookId, bookIds));

  const writersByBook = new Map<number, string[]>();
  for (const row of writerRows) {
    const list = writersByBook.get(row.bookId) ?? [];
    list.push(row.name);
    writersByBook.set(row.bookId, list);
  }

  return rows.map((r) => ({ ...r, writers: writersByBook.get(r.id) ?? [] }));
}

export async function approveBookSubmission(bookId: number): Promise<void> {
  await db.update(book).set({ approve: 1 }).where(eq(book.id, bookId));
  updateTag("pending-book-submissions");
  updateTag("latest-books");

  const [bookRow] = await db.select({ name: book.name }).from(book).where(eq(book.id, bookId)).limit(1);
  const writerRows = await db.select({ writerId: writerBook.writerId }).from(writerBook).where(eq(writerBook.bookId, bookId));
  const writerIds = writerRows.map((r) => r.writerId);
  if (bookRow && writerIds.length > 0) await notifyWriterLikersOfNewBook(writerIds, bookRow.name);
}

/** Reject = delete outright - unlike blog's dual-version system, a rejected
 * book submission has no "live version" to fall back to, it was never
 * public (book.approve=0 means it doesn't surface in any real listing). */
export async function rejectBookSubmission(bookId: number): Promise<void> {
  await db.delete(bookCategory).where(eq(bookCategory.bookId, bookId));
  await db.delete(writerBook).where(eq(writerBook.bookId, bookId));
  await db.delete(translatorBook).where(eq(translatorBook.bookId, bookId));
  await db.delete(book).where(and(eq(book.id, bookId), eq(book.approve, 0)));
  updateTag("pending-book-submissions");
}

export interface BookAdminListItem {
  id: number;
  name: string;
  orgName: string;
  lang: string;
  publisherName: string;
  approve: number;
}

/**
 * Direct "Kitaplar" admin management list - ports v1's real
 * BookController::getAll() (the Admin-only management endpoint, NOT
 * getAllBooksForClient()/the /kitap/yeni submission flow). Same perf
 * choices already established elsewhere in this file's sibling queries:
 * prefix-only LIKE (this table's real B-tree indexes can't serve a
 * leading-wildcard/LOWER() scan at ~98.5M rows) and an InnoDB row-count
 * estimate instead of COUNT(*) when unfiltered.
 */
export async function getBookAdminList(
  page = 1,
  pageSize = 20,
  search = "",
): Promise<{ items: BookAdminListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim();
  const whereClause = trimmedSearch
    ? or(like(book.name, `${trimmedSearch}%`), like(book.orgName, `${trimmedSearch}%`))
    : undefined;

  let total: number;
  if (!trimmedSearch) {
    const rows = (await db.execute(
      sql`SELECT TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'book'`,
    ))[0] as unknown as { TABLE_ROWS: number }[];
    total = Number(rows[0]?.TABLE_ROWS ?? 0);
  } else {
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(book).where(whereClause);
    total = Number(countRow?.count ?? 0);
  }

  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), lastPage);

  const items = await db
    .select({ id: book.id, name: book.name, orgName: book.orgName, lang: book.lang, publisherName: publisher.name, approve: book.approve })
    .from(book)
    .innerJoin(publisher, eq(book.publisherId, publisher.id))
    .where(whereClause)
    .orderBy(book.approve, desc(book.id))
    .limit(safeSize)
    .offset((safePage - 1) * safeSize);

  return { items, total, page: safePage, lastPage };
}

export interface BookAdminDetail {
  id: number;
  name: string;
  orgName: string;
  lang: string;
  content: string | null;
  format: string | null;
  isbn: string | null;
  pageNumber: number;
  date: string | null;
  approve: number;
  publisherId: number;
  publisherName: string;
  writers: { id: number; name: string }[];
  translators: { id: number; name: string }[];
  categories: { id: number; name: string }[];
}

export async function getBookAdminDetail(bookId: number): Promise<BookAdminDetail | null> {
  const [row] = await db
    .select({
      id: book.id, name: book.name, orgName: book.orgName, lang: book.lang, content: book.content,
      format: book.format, isbn: book.isbn, pageNumber: book.pageNumber, date: book.date, approve: book.approve,
      publisherId: book.publisherId, publisherName: publisher.name,
    })
    .from(book)
    .innerJoin(publisher, eq(book.publisherId, publisher.id))
    .where(eq(book.id, bookId))
    .limit(1);
  if (!row) return null;

  const writerRows = await db.select({ id: writer.id, name: writer.name }).from(writerBook)
    .innerJoin(writer, eq(writerBook.writerId, writer.id)).where(eq(writerBook.bookId, bookId));
  const translatorRows = await db.select({ id: translator.id, name: translator.name }).from(translatorBook)
    .innerJoin(translator, eq(translatorBook.translatorId, translator.id)).where(eq(translatorBook.bookId, bookId));
  const categoryRows = await db.select({ id: category.id, name: category.category }).from(bookCategory)
    .innerJoin(category, eq(bookCategory.categoryId, category.id)).where(eq(bookCategory.bookId, bookId));

  return { ...row, writers: writerRows, translators: translatorRows, categories: categoryRows };
}

/** The "edition group" a book belongs to - itself if it's the original work,
 * or itself + every sibling edition if it has (or is) a parent. Writer/
 * category edits apply across the whole group (matches v1's real update()
 * exactly - both fields conceptually belong to the original work, not each
 * translated edition), translator edits apply to just the one book. */
async function getEditionGroupIds(bookId: number): Promise<number[]> {
  const [row] = await db.select({ originalBookId: book.originalBookId }).from(book).where(eq(book.id, bookId)).limit(1);
  if (!row) return [bookId];
  const rootId = row.originalBookId ?? bookId;
  const children = await db.select({ id: book.id }).from(book).where(eq(book.originalBookId, rootId));
  return [rootId, ...children.map((c) => c.id)].filter((id, i, arr) => arr.indexOf(id) === i);
}

export type BookAdminUpdateMode =
  | "name" | "content" | "lang" | "pageNumber" | "format" | "isbn" | "date" | "approve"
  | "writer" | "translator" | "category";

export async function updateBookAdminField(
  bookId: number,
  mode: BookAdminUpdateMode,
  value: string | number[],
): Promise<void> {
  const [existing] = await db.select({ id: book.id, publisherId: book.publisherId }).from(book).where(eq(book.id, bookId)).limit(1);
  if (!existing) throw new Error("Kitap bulunamadı.");

  if (mode === "writer" || mode === "category") {
    const ids = Array.isArray(value) ? value : [];
    const groupIds = await getEditionGroupIds(bookId);
    if (mode === "writer") {
      await db.delete(writerBook).where(inArray(writerBook.bookId, groupIds));
      if (ids.length > 0) {
        const rows = groupIds.flatMap((gid) => ids.map((writerId) => ({ writerId, bookId: gid })));
        await db.insert(writerBook).values(rows);
      }
    } else {
      await db.delete(bookCategory).where(inArray(bookCategory.bookId, groupIds));
      if (ids.length > 0) {
        const rows = groupIds.flatMap((gid) => ids.map((categoryId) => ({ categoryId, bookId: gid })));
        await db.insert(bookCategory).values(rows);
      }
    }
    return;
  }

  if (mode === "translator") {
    const ids = Array.isArray(value) ? value : [];
    await db.delete(translatorBook).where(eq(translatorBook.bookId, bookId));
    if (ids.length > 0) {
      await db.insert(translatorBook).values(ids.map((translatorId) => ({ translatorId, bookId })));
    }
    return;
  }

  const text = typeof value === "string" ? value.trim() : "";
  if ((mode === "name" || mode === "lang") && !text) throw new Error("Bu alan boş bırakılamaz.");
  if (isDirty(text)) throw new Error("Hakaret içeren içerik ekleyemezsiniz.");

  switch (mode) {
    case "name": {
      const [publisherRow] = await db.select({ name: publisher.name }).from(publisher).where(eq(publisher.id, existing.publisherId)).limit(1);
      const slug = `${slugify(publisherRow?.name ?? "")}-${slugify(text)}`.slice(0, 250);
      await db.update(book).set({ name: text, slug }).where(eq(book.id, bookId));
      break;
    }
    case "content":
      await db.update(book).set({ content: text || null }).where(eq(book.id, bookId));
      break;
    case "lang":
      await db.update(book).set({ lang: text }).where(eq(book.id, bookId));
      break;
    case "pageNumber": {
      const pageNumber = Number(text);
      if (!Number.isInteger(pageNumber) || pageNumber <= 0) throw new Error("Geçerli bir sayfa sayısı giriniz.");
      await db.update(book).set({ pageNumber }).where(eq(book.id, bookId));
      break;
    }
    case "format":
      await db.update(book).set({ format: text || null }).where(eq(book.id, bookId));
      break;
    case "isbn":
      await db.update(book).set({ isbn: text || null }).where(eq(book.id, bookId));
      break;
    case "date":
      await db.update(book).set({ date: text || null }).where(eq(book.id, bookId));
      break;
    case "approve":
      await db.update(book).set({ approve: text === "1" ? 1 : 0 }).where(eq(book.id, bookId));
      updateTag("pending-book-submissions");
      updateTag("latest-books");
      break;
  }
}

export async function deleteBookAdmin(bookId: number): Promise<void> {
  await deleteBookCascade(bookId);
}

export async function deleteBooksAdmin(bookIds: number[]): Promise<{ success: number; fail: number }> {
  let success = 0;
  for (const id of bookIds) {
    const [existing] = await db.select({ id: book.id }).from(book).where(eq(book.id, id)).limit(1);
    if (existing) {
      await deleteBookCascade(id);
      success++;
    }
  }
  return { success, fail: bookIds.length - success };
}
