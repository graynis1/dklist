import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { writer, writerBook, book } from "@/db/schema";

export interface WriterDetail {
  id: number;
  name: string;
  slug: string;
  biyo: string | null;
  score: number;
}

export async function getWriterBySlug(slug: string): Promise<WriterDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`writer:${slug}`);

  const [row] = await db
    .select({
      id: writer.id,
      name: writer.name,
      slug: writer.slug,
      biyo: writer.biyo,
      score: writer.score,
    })
    .from(writer)
    .where(eq(writer.slug, slug))
    .limit(1);

  return row ?? null;
}

export interface WriterBookItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
}

export async function getBooksByWriter(writerId: number): Promise<WriterBookItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`writer-books:${writerId}`);

  return db
    .select({
      id: book.id,
      name: book.name,
      slug: book.slug,
      score: book.score,
      viewCount: book.viewCount,
    })
    .from(writerBook)
    .innerJoin(book, eq(writerBook.bookId, book.id))
    .where(eq(writerBook.writerId, writerId))
    .orderBy(desc(book.viewCount));
}
