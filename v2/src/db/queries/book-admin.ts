import "server-only";
import { cacheLife, cacheTag, updateTag } from "next/cache";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { book, publisher, writer, writerBook, category, bookCategory, translator, translatorBook, user } from "@/db/schema";
import { isDirty } from "@/lib/dirty-controller";
import { AUTO_APPROVE_ROLES, type UserType } from "@/lib/permission";

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
  if (approved) updateTag("latest-books");

  return { id: bookId, slug, approved };
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
