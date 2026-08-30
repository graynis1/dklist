import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { attachWriterNames } from "@/db/queries/books";
import { prefixPattern } from "@/lib/sql-like";

export interface SearchResultBook {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  hasImage: boolean;
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
    SELECT b.id, b.name, b.slug, b.score, b.view_count AS viewCount,
      (b.image IS NOT NULL AND b.image != '') AS hasImage
    FROM book b
    WHERE b.name LIKE ${prefixPattern(trimmed)}
    ORDER BY b.view_count DESC
    LIMIT ${limit}
  `))[0] as unknown as Omit<SearchResultBook, "writers">[];

  return attachWriterNames(rows.map((r) => ({ ...r, hasImage: Boolean(r.hasImage) })));
}

export interface SearchResultEntity {
  id: number;
  name: string;
  slug: string;
}

/**
 * v1's GeneralController::search() returns five categories (books, writers,
 * translators, publishers, users), not just books - the header search box
 * lost the other four in the initial v2 port. Same prefix-only LIKE pattern
 * as searchBooks, for the same HDD-related reason.
 */
export async function searchWriters(term: string, limit = 5): Promise<SearchResultEntity[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`search-writers:${term}`);

  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  return (await db.execute(sql`
    SELECT id, name, slug FROM writer WHERE name LIKE ${prefixPattern(trimmed)} LIMIT ${limit}
  `))[0] as unknown as SearchResultEntity[];
}

export async function searchTranslators(term: string, limit = 5): Promise<SearchResultEntity[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`search-translators:${term}`);

  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  return (await db.execute(sql`
    SELECT id, name, slug FROM translator WHERE name LIKE ${prefixPattern(trimmed)} LIMIT ${limit}
  `))[0] as unknown as SearchResultEntity[];
}

export async function searchPublishers(term: string, limit = 5): Promise<SearchResultEntity[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`search-publishers:${term}`);

  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  return (await db.execute(sql`
    SELECT id, name, slug FROM publisher WHERE name LIKE ${prefixPattern(trimmed)} LIMIT ${limit}
  `))[0] as unknown as SearchResultEntity[];
}

export interface SearchResultUser {
  id: number;
  username: string;
}

export async function searchUsers(term: string, limit = 5): Promise<SearchResultUser[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`search-users:${term}`);

  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  return (await db.execute(sql`
    SELECT id, username FROM user WHERE username LIKE ${prefixPattern(trimmed)} LIMIT ${limit}
  `))[0] as unknown as SearchResultUser[];
}
