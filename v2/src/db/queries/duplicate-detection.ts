import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { book, writerBook, writer } from "@/db/schema";
import {
  normalizeTitle,
  normalizeIsbn,
  titleAuthorSimilarity,
  DUPLICATE_MATCH_THRESHOLD,
} from "@/lib/duplicate-detection";

/**
 * Dry-run only - reports candidate duplicate groups, writes nothing. Bounded
 * to a `limit` slice of the `book` table (never a full 98.5M-row scan) since
 * this is meant to prove the detection pipeline itself works, not to run the
 * real backfill - that needs its own indexing/batching design first (see
 * PLAN.md's Phase 5 notes: `book.isbn` has no index on the real prod table).
 */
export interface DuplicateGroup {
  matchType: "isbn" | "normalized_title" | "fuzzy_title_author";
  bookIds: number[];
  key: string;
  score?: number;
}

export async function findDuplicateCandidatesDryRun(limit = 5000): Promise<{
  scanned: number;
  isbnGroups: DuplicateGroup[];
  normalizedTitleGroups: DuplicateGroup[];
  fuzzyGroups: DuplicateGroup[];
}> {
  const rows = await db
    .select({ id: book.id, name: book.name, isbn: book.isbn })
    .from(book)
    .limit(limit);

  // Stage 1: ISBN exact match, normalized/canonicalized to ISBN-13 first so
  // e.g. a hyphenated ISBN-10 row and a plain ISBN-13 row for the same real
  // book still match instead of comparing as different raw strings.
  const byIsbn = new Map<string, number[]>();
  for (const r of rows) {
    if (!r.isbn) continue;
    const key = normalizeIsbn(r.isbn);
    if (!key) continue;
    const list = byIsbn.get(key) ?? [];
    list.push(r.id);
    byIsbn.set(key, list);
  }
  const isbnGroups: DuplicateGroup[] = [];
  const matchedByIsbn = new Set<number>();
  for (const [isbn, ids] of byIsbn) {
    if (ids.length > 1) {
      isbnGroups.push({ matchType: "isbn", bookIds: ids, key: isbn });
      ids.forEach((id) => matchedByIsbn.add(id));
    }
  }

  // Stage 2: normalized-title match, excluding books already grouped by ISBN.
  const remaining = rows.filter((r) => !matchedByIsbn.has(r.id));
  const byNormTitle = new Map<string, number[]>();
  for (const r of remaining) {
    const key = normalizeTitle(r.name);
    if (!key) continue;
    const list = byNormTitle.get(key) ?? [];
    list.push(r.id);
    byNormTitle.set(key, list);
  }
  const normalizedTitleGroups: DuplicateGroup[] = [];
  const matchedByTitle = new Set<number>();
  for (const [key, ids] of byNormTitle) {
    if (ids.length > 1) {
      normalizedTitleGroups.push({ matchType: "normalized_title", bookIds: ids, key });
      ids.forEach((id) => matchedByTitle.add(id));
    }
  }

  // Stage 3: fuzzy title+author, only across books neither stage above
  // already grouped - this is the expensive O(n^2) stage, so it only ever
  // runs over the small remainder, never the full scanned set.
  const fuzzyCandidates = remaining.filter((r) => !matchedByTitle.has(r.id));
  const authorsByBook = new Map<number, string[]>();
  if (fuzzyCandidates.length > 0) {
    const bookIds = fuzzyCandidates.map((r) => r.id);
    const links = await db
      .select({ bookId: writerBook.bookId, name: writer.name })
      .from(writerBook)
      .innerJoin(writer, eq(writer.id, writerBook.writerId))
      .where(inArray(writerBook.bookId, bookIds));
    for (const l of links) {
      const list = authorsByBook.get(l.bookId) ?? [];
      list.push(l.name);
      authorsByBook.set(l.bookId, list);
    }
  }

  const fuzzyGroups: DuplicateGroup[] = [];
  const consumed = new Set<number>();
  for (let i = 0; i < fuzzyCandidates.length; i++) {
    const a = fuzzyCandidates[i];
    if (consumed.has(a.id)) continue;
    const group = [a.id];
    for (let j = i + 1; j < fuzzyCandidates.length; j++) {
      const b = fuzzyCandidates[j];
      if (consumed.has(b.id)) continue;
      const score = titleAuthorSimilarity(
        a.name,
        authorsByBook.get(a.id) ?? [],
        b.name,
        authorsByBook.get(b.id) ?? [],
      );
      if (score >= DUPLICATE_MATCH_THRESHOLD) {
        group.push(b.id);
        consumed.add(b.id);
      }
    }
    if (group.length > 1) {
      group.forEach((id) => consumed.add(id));
      fuzzyGroups.push({ matchType: "fuzzy_title_author", bookIds: group, key: normalizeTitle(a.name) });
    }
  }

  return { scanned: rows.length, isbnGroups, normalizedTitleGroups, fuzzyGroups };
}
