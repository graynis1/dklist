/**
 * Pure nearest-neighbor-margin decision for the embedding-based moderation
 * check (see moderation.ts's isLikelyAbusive()) - deliberately its own
 * module, with no "server-only"/model-loading imports, so it's unit
 * testable. moderation.ts (and the embeddings.ts module it uses for real
 * embedding generation) are both "server-only" - importing either directly
 * from a vitest test throws ("This module cannot be imported from a Client
 * Component module"), confirmed by trying it. Same underlying reason other
 * pure-logic extractions in this repo (checkRateLimit, matchFaqAnswer) live
 * in their own DB/server-free module rather than being tested through their
 * real host file.
 *
 * Takes already-computed embedding vectors, not raw text or a loaded model -
 * moderation.ts is responsible for calling getEmbedding()/getReferenceVectors()
 * and handing the results here.
 */

/** Assumes both vectors are already L2-normalized (true for this project's
 * real embedding model, called with `normalize: true`), so a plain dot
 * product IS the cosine similarity - same assumption/guard as embeddings.ts's
 * own cosineSimilarity(), duplicated here (not imported) specifically to
 * keep this file free of the "server-only" import chain. */
function similarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export function classifyByEmbeddingMargin(
  vector: number[],
  abusiveVectors: number[][],
  neutralVectors: number[][],
  margin: number,
): { abusiveScore: number; neutralScore: number; blocked: boolean } {
  if (vector.length === 0 || abusiveVectors.length === 0 || neutralVectors.length === 0) {
    return { abusiveScore: 0, neutralScore: 0, blocked: false };
  }
  const abusiveScore = Math.max(...abusiveVectors.map((v) => similarity(vector, v)));
  const neutralScore = Math.max(...neutralVectors.map((v) => similarity(vector, v)));
  return { abusiveScore, neutralScore, blocked: abusiveScore - neutralScore > margin };
}
