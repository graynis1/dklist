import "server-only";
import { inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookEmbedding, book } from "@/db/schema";
import { getEmbedding, cosineSimilarity, EMBEDDING_MODEL } from "@/lib/embeddings";
import { attachWriterNames } from "@/db/queries/books";

/**
 * Computes and stores a book's content embedding - called from write paths
 * only (book creation/approval), never from a cached read path. Best-effort:
 * a model load hiccup shouldn't block the book submission itself, so
 * failures are logged and swallowed rather than thrown.
 */
export async function computeAndStoreBookEmbedding(
  bookId: number,
  name: string,
  orgName: string,
  content: string | null,
): Promise<void> {
  try {
    const text = [name, orgName, content ?? ""].filter(Boolean).join(". ");
    if (!text.trim()) return;
    const vector = await getEmbedding(text);
    if (vector.length === 0) return;

    await db
      .insert(bookEmbedding)
      .values({
        bookId,
        embedding: vector,
        model: EMBEDDING_MODEL,
        createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      })
      .onDuplicateKeyUpdate({ set: { embedding: vector, model: EMBEDDING_MODEL } });
  } catch (err) {
    console.error(`[book-embedding] failed to compute embedding for book ${bookId}:`, err);
  }
}

/**
 * Re-ranks a category-matched candidate list by actual content/theme
 * similarity ("Book DNA") rather than only score - falls back silently
 * (returns candidateIds unchanged) for any book missing an embedding yet,
 * since embeddings are computed lazily going forward, not backfilled for
 * every existing book at once.
 */
export async function rankByContentSimilarity(
  bookId: number,
  candidateIds: number[],
): Promise<number[]> {
  if (candidateIds.length === 0) return candidateIds;

  const rows = await db
    .select({ bookId: bookEmbedding.bookId, embedding: bookEmbedding.embedding })
    .from(bookEmbedding)
    .where(inArray(bookEmbedding.bookId, [bookId, ...candidateIds]));

  const vectors = new Map(rows.map((r) => [r.bookId, r.embedding as number[]]));
  const target = vectors.get(bookId);
  if (!target) return candidateIds;

  const scored = candidateIds.map((id) => {
    const vec = vectors.get(id);
    return { id, similarity: vec ? cosineSimilarity(target, vec) : -1 };
  });

  // Only reorder among candidates that actually have an embedding - ones
  // without one keep their original relative order, appended at the end,
  // rather than being scored as "0 similarity" and mixed in arbitrarily.
  const withEmbedding = scored.filter((s) => s.similarity >= 0).sort((a, b) => b.similarity - a.similarity);
  const withoutEmbedding = scored.filter((s) => s.similarity < 0);
  return [...withEmbedding, ...withoutEmbedding].map((s) => s.id);
}

export interface SemanticSearchResultBook {
  id: number;
  name: string;
  slug: string;
  score: number;
  viewCount: number;
  writers: string[];
  similarity: number;
}

// Require a real minimum before showing a semantic match at all - an
// unrelated query still has SOME nonzero cosine similarity to every book
// (nothing in a 384-dim space is ever exactly orthogonal), so without a
// floor this would surface noise for a search term that has no genuine
// thematic match in the (currently sparse) embedded catalog. Calibrated
// empirically (not guessed): a 5-book/5-query spot-check found genuine
// thematic matches cluster at 0.55-0.63, while clearly-unrelated pairs
// (e.g. an accounting-textbook query against a fantasy novel) still reach
// 0.35-0.43 on this model's baseline noise - a lower floor would have let
// that specific false positive through.
const MIN_SIMILARITY = 0.5;

/**
 * "Search by meaning" - reuses the same embedding infrastructure as Book
 * DNA (getSimilarBooks) rather than the prefix-only LIKE search everywhere
 * else in search.ts. Deliberately NOT a replacement for that search - see
 * its own doc comment for why FULLTEXT/substring search stays off this
 * HDD-backed table - this is a genuinely different capability (matching
 * theme/plot, not spelling), shown as a separate results section.
 *
 * Coverage caveat, same as Book DNA: `book_embedding` is only populated
 * going forward (new/re-approved submissions), not backfilled across the
 * ~98.5M-row existing catalog - this searches whatever has an embedding
 * today and grows over time, exactly like the similar-books widget.
 * Scans the whole `book_embedding` table in JS rather than in SQL (no
 * vector index in plain MySQL) - fine while that table is small; would
 * need a real ANN index (or an external vector store) if it ever grows to
 * a meaningful fraction of the catalog.
 */
export async function semanticSearchBooks(term: string, limit = 8): Promise<SemanticSearchResultBook[]> {
  const trimmed = term.trim();
  if (trimmed.length < 3) return [];

  let queryVector: number[];
  try {
    queryVector = await getEmbedding(trimmed);
  } catch (err) {
    console.error("[semantic-search] embedding failed, skipping:", err);
    return [];
  }
  if (queryVector.length === 0) return [];

  const rows = await db.select({ bookId: bookEmbedding.bookId, embedding: bookEmbedding.embedding }).from(bookEmbedding);
  if (rows.length === 0) return [];

  const scored = rows
    .map((r) => ({ bookId: r.bookId, similarity: cosineSimilarity(queryVector, r.embedding as number[]) }))
    .filter((r) => r.similarity >= MIN_SIMILARITY)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
  if (scored.length === 0) return [];

  const bookRows = await db
    .select({ id: book.id, name: book.name, slug: book.slug, score: book.score, viewCount: book.viewCount })
    .from(book)
    .where(inArray(book.id, scored.map((s) => s.bookId)));

  const withWriters = await attachWriterNames(bookRows);
  const byId = new Map(withWriters.map((b) => [b.id, b]));
  const similarityById = new Map(scored.map((s) => [s.bookId, s.similarity]));

  return scored
    .map((s) => {
      const b = byId.get(s.bookId);
      if (!b) return null;
      return { ...b, similarity: similarityById.get(s.bookId) ?? 0 };
    })
    .filter((b): b is SemanticSearchResultBook => b !== null);
}
