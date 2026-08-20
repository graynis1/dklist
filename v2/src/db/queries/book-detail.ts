import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { book, publisher, writer, writerBook, category, bookCategory } from "@/db/schema";

export interface BookDetail {
  id: number;
  name: string;
  orgName: string;
  slug: string;
  score: number;
  viewCount: number;
  pageNumber: number;
  publisher: { id: number; name: string; slug: string } | null;
  writers: { id: number; name: string; slug: string }[];
  categories: { id: number; name: string; slug: string }[];
}

export async function getBookBySlug(slug: string): Promise<BookDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`book:${slug}`);

  const [row] = await db
    .select({
      id: book.id,
      name: book.name,
      orgName: book.orgName,
      slug: book.slug,
      score: book.score,
      viewCount: book.viewCount,
      pageNumber: book.pageNumber,
      publisherId: publisher.id,
      publisherName: publisher.name,
      publisherSlug: publisher.slug,
    })
    .from(book)
    .leftJoin(publisher, eq(book.publisherId, publisher.id))
    .where(eq(book.slug, slug))
    .limit(1);

  if (!row) return null;

  const writerRows = await db
    .select({ id: writer.id, name: writer.name, slug: writer.slug })
    .from(writerBook)
    .innerJoin(writer, eq(writerBook.writerId, writer.id))
    .where(eq(writerBook.bookId, row.id));

  const categoryRows = await db
    .select({ id: category.id, name: category.category, slug: category.slug })
    .from(bookCategory)
    .innerJoin(category, eq(bookCategory.categoryId, category.id))
    .where(eq(bookCategory.bookId, row.id));

  return {
    id: row.id,
    name: row.name,
    orgName: row.orgName,
    slug: row.slug,
    score: row.score,
    viewCount: Number(row.viewCount),
    pageNumber: row.pageNumber,
    publisher: row.publisherId
      ? { id: row.publisherId, name: row.publisherName!, slug: row.publisherSlug! }
      : null,
    writers: writerRows,
    categories: categoryRows,
  };
}
