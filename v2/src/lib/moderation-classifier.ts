/**
 * Pure nearest-neighbor-margin decision shared by moderation.ts's two
 * embedding-based checks: isLikelyAbusive() (abusive vs. neutral examples)
 * and isOffTopicFromBooks() (off-topic vs. on-topic examples) - both are
 * the exact same "closer to the target set than the counter set, by more
 * than a margin" shape, previously duplicated inline in each function with
 * only the example lists and margin value differing.
 *
 * Deliberately its own module, with no "server-only"/model-loading imports,
 * so it's unit testable - moderation.ts (and the embeddings.ts module it
 * uses for real embedding generation) are both "server-only", and importing
 * either directly from a vitest test throws ("This module cannot be
 * imported from a Client Component module"). Same reason other pure-logic
 * extractions in this repo (checkRateLimit, matchFaqAnswer) live in their
 * own DB/server-free module rather than being tested through their real
 * host file.
 *
 * Takes already-computed embedding vectors, not raw text or a loaded model -
 * moderation.ts is responsible for calling getEmbedding() and handing the
 * results here.
 */

/** Assumes both vectors are already L2-normalized (true for this project's
 * real embedding model, called with `normalize: true`), so a plain dot
 * product IS the cosine similarity - same assumption as embeddings.ts's own
 * cosineSimilarity(), duplicated here (not imported) specifically to keep
 * this file free of the "server-only" import chain. */
function dotProductSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export interface MarginClassification {
  targetScore: number;
  counterScore: number;
  matched: boolean;
}

/**
 * `matched` is true only when the vector is CLEARLY closer to the target
 * set than the counter set (by more than `margin`), not merely closer -
 * a near-tie falls through to `matched: false` so callers can route it to
 * a softer/manual-review path instead of a hard decision. Matches
 * moderation.ts's existing BLOCK_MARGIN/OFF_TOPIC_MARGIN reasoning: the
 * embedding-similarity approach is good but imperfect, so a boundary case
 * should never be hard-decided either way.
 */
export function classifyByEmbeddingMargin(
  vector: number[],
  targetVectors: number[][],
  counterVectors: number[][],
  margin: number,
): MarginClassification {
  if (vector.length === 0 || targetVectors.length === 0 || counterVectors.length === 0) {
    return { targetScore: 0, counterScore: 0, matched: false };
  }
  const targetScore = Math.max(...targetVectors.map((v) => dotProductSimilarity(vector, v)));
  const counterScore = Math.max(...counterVectors.map((v) => dotProductSimilarity(vector, v)));
  return { targetScore, counterScore, matched: targetScore - counterScore > margin };
}
