import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { eq, desc } from "drizzle-orm";
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
