import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { eq, desc, asc, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { translator, translatorBook, book } from "@/db/schema";

export interface TranslatorDetail {
  id: number;
  name: string;
  slug: string;
  biyo: string | null;
  score: number;
}

export async function getTranslatorBySlug(slug: string): Promise<TranslatorDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`translator:${slug}`);

  const [row] = await db
    .select({
      id: translator.id,
      name: translator.name,
      slug: translator.slug,
      biyo: translator.biyo,
      score: translator.score,
    })
    .from(translator)
    .where(eq(translator.slug, slug))
    .limit(1);

  return row ?? null;
}

export interface TranslatorListItem {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  score: number;
}

/**
 * v1's TranslatorController::getAllTranslatorsForClient() - unlike writer/
 * publisher, this always runs a real COUNT(DISTINCT), no InnoDB-estimate
 * trick, even with no search filter. Confirmed this isn't an oversight: a
 * read-only prod check found `translator` has only ~49K rows (vs. writer's
 * ~11.3M / publisher's ~4.6M) - small enough that a real COUNT(*) is cheap
 * even on this HDD-backed instance, matching v1's own choice not to bother
 * optimizing it.
 */
export async function getTranslatorList(
  page = 1,
  pageSize = 40,
  search = "",
): Promise<{ items: TranslatorListItem[]; total: number; page: number; lastPage: number }> {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const trimmedSearch = search.trim().toLowerCase();
  const whereClause = like(sql`LOWER(${translator.name})`, `%${trimmedSearch}%`);

  const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(translator).where(whereClause);
  const total = Number(countRow?.count ?? 0);
  const lastPage = Math.max(1, Math.ceil(total / safeSize));
  const effectivePage = Math.min(Math.max(1, page), lastPage);

  const items = await db
    .select({ id: translator.id, name: translator.name, slug: translator.slug, image: translator.img, score: translator.score })
    .from(translator)
    .where(whereClause)
    .orderBy(asc(translator.id))
    .limit(safeSize)
    .offset((effectivePage - 1) * safeSize);

  return { items, total, page: effectivePage, lastPage };
}

export interface TranslatorBookItem {
  id: number;
  name: string;
  slug: string;
  score: number;
}

export async function getBooksByTranslator(translatorId: number): Promise<TranslatorBookItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`translator-books:${translatorId}`);

  return db
    .select({ id: book.id, name: book.name, slug: book.slug, score: book.score })
    .from(translatorBook)
    .innerJoin(book, eq(translatorBook.bookId, book.id))
    .where(eq(translatorBook.translatorId, translatorId))
    .orderBy(desc(book.viewCount));
}
