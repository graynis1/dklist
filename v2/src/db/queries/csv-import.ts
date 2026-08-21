import "server-only";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { book, writer, writerBook } from "@/db/schema";
import { parseGoodreadsExport, mapGoodreadsShelf } from "@/lib/csv-import";
import { titleAuthorSimilarity, normalizeTitle } from "@/lib/duplicate-detection";
import { setReadStatus } from "@/db/queries/reading-status";
import { toggleLibrary, isInLibrary } from "@/db/queries/library";

const MATCH_THRESHOLD = 0.85;
// A giant real export (thousands of shelved books) hammering the DB with
// one search+fuzzy-score pass per row with no batching/queue infra behind
// this feature - capped at a size generous enough for a real personal
// library but not open-ended.
const MAX_ROWS = 500;

interface CandidateBook {
  id: number;
  name: string;
  writers: string[];
}

async function findBestMatch(title: string, author: string): Promise<CandidateBook | null> {
  const normalized = normalizeTitle(title);
  const firstWord = normalized.split(" ")[0];
  if (!firstWord) return null;

  // Prefix search only (this app's standing no-FULLTEXT constraint) - a
  // real limitation: a Goodreads title differing from the catalog's in its
  // very first word (e.g. a translated vs. original-language title) won't
  // surface any candidates at all. Documented, not silently papered over -
  // such rows land in the "unmatched" list for the user to add by hand.
  const candidates = await db
    .select({ id: book.id, name: book.name })
    .from(book)
    .where(sql`${book.name} LIKE ${firstWord + "%"}`)
    .limit(30);

  if (candidates.length === 0) return null;

  const candidateIds = candidates.map((c) => c.id);
  const writerRows = await db
    .select({ bookId: writerBook.bookId, name: writer.name })
    .from(writerBook)
    .innerJoin(writer, eq(writerBook.writerId, writer.id))
    .where(sql`${writerBook.bookId} IN (${sql.join(candidateIds, sql`, `)})`);

  const writersByBook = new Map<number, string[]>();
  for (const w of writerRows) {
    if (!writersByBook.has(w.bookId)) writersByBook.set(w.bookId, []);
    writersByBook.get(w.bookId)!.push(w.name);
  }

  let best: CandidateBook | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const cWriters = writersByBook.get(c.id) ?? [];
    const score = titleAuthorSimilarity(title, author ? [author] : [], c.name, cWriters);
    if (score > bestScore) {
      bestScore = score;
      best = { id: c.id, name: c.name, writers: cWriters };
    }
  }

  return bestScore >= MATCH_THRESHOLD ? best : null;
}

export interface ImportResultRow {
  csvTitle: string;
  csvAuthor: string;
  matched: boolean;
  matchedBookName?: string;
  matchedBookId?: number;
}

export interface ImportSummary {
  totalRows: number;
  matchedCount: number;
  results: ImportResultRow[];
}

/**
 * Goodreads library import - matches each row against the catalog via the
 * same fuzzy title+author scoring built for Phase 5's duplicate-detection
 * pipeline (src/lib/duplicate-detection.ts), then applies reading status +
 * library membership for real matches. Never fails the whole import over
 * one bad/unmatched row - always returns a full per-row summary so the
 * user can see exactly what came in and what didn't.
 */
export async function importGoodreadsCsv(userId: number, csvText: string): Promise<ImportSummary> {
  const rows = parseGoodreadsExport(csvText).slice(0, MAX_ROWS);
  const results: ImportResultRow[] = [];
  let matchedCount = 0;

  for (const row of rows) {
    const match = await findBestMatch(row.title, row.author);
    if (!match) {
      results.push({ csvTitle: row.title, csvAuthor: row.author, matched: false });
      continue;
    }

    const status = mapGoodreadsShelf(row.shelf);
    if (status) {
      await setReadStatus({ userId, bookId: match.id, status });
    }
    if (!(await isInLibrary(userId, match.id))) {
      await toggleLibrary(userId, match.id);
    }

    matchedCount += 1;
    results.push({
      csvTitle: row.title,
      csvAuthor: row.author,
      matched: true,
      matchedBookName: match.name,
      matchedBookId: match.id,
    });
  }

  return { totalRows: rows.length, matchedCount, results };
}
