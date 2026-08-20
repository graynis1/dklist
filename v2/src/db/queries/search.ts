import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { attachWriterNames } from "@/db/queries/books";

export interface SearchResultBook {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  writers: string[];
}

/**
 * Prefix-only search (`LIKE 'term%'`), not substring - a deliberate, carried-
 * forward v1 decision, not an oversight. A real FULLTEXT index on `book.name`
 * was attempted twice in v1 and abandoned both times (4+ hours each, killed by
 * power outages) because the data drive is a spinning HDD, not an SSD - see
 * PLAN.md / [[feedback-search-fulltext-abandoned]] in project memory. Do not
 * re-attempt FULLTEXT here without a dedicated, scheduled decision - a plain
 * `LIKE 'term%'` can still use idx_book_name's B-tree (leading wildcard only),
 * which is exactly why the term is anchored at the start, not wrapped in `%`.
 */
export async function searchBooks(
  term: string,
  limit = 20,
): Promise<SearchResultBook[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`search:${term}`);

  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const rows = (await db.execute(sql`
    SELECT b.id, b.name, b.slug, b.score, b.view_count AS viewCount
    FROM book b
    WHERE b.name LIKE ${trimmed + "%"}
    ORDER BY b.view_count DESC
    LIMIT ${limit}
  `))[0] as unknown as Omit<SearchResultBook, "writers">[];

  return attachWriterNames(rows);
}
