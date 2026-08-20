import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { publisher, book } from "@/db/schema";
import { attachWriterNames } from "@/db/queries/books";

export interface PublisherDetail {
  id: number;
  name: string;
  slug: string;
}

export async function getPublisherBySlug(slug: string): Promise<PublisherDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`publisher:${slug}`);

  const [row] = await db
    .select({ id: publisher.id, name: publisher.name, slug: publisher.slug })
    .from(publisher)
    .where(eq(publisher.slug, slug))
    .limit(1);

  return row ?? null;
}

export interface PublisherBookItem {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  writers: string[];
}

export async function getBooksByPublisher(publisherId: number): Promise<PublisherBookItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`publisher-books:${publisherId}`);

  const rows = await db
    .select({
      id: book.id,
      name: book.name,
      slug: book.slug,
      score: book.score,
      viewCount: book.viewCount,
    })
    .from(book)
    .where(eq(book.publisherId, publisherId))
    .orderBy(desc(book.viewCount));

  return attachWriterNames(rows);
}
