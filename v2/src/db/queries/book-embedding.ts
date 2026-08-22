import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookEmbedding } from "@/db/schema";
import { getEmbedding, cosineSimilarity, EMBEDDING_MODEL } from "@/lib/embeddings";

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
