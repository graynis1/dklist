/**
 * Pure vector-math helpers with no server dependency - split out of
 * embeddings.ts (which has `import "server-only"`, since it also loads the
 * real ONNX embedding model) for the same reason roles.ts was split out of
 * permission.ts: a module with `import "server-only"` throws immediately on
 * import outside a React Server Component context - including under plain
 * Vitest, which doesn't set the `react-server` resolution condition that
 * makes the package resolve to its no-op `empty.js` instead. `cosineSimilarity`
 * itself has zero model/DB dependency, so it belongs here where it's
 * actually testable; embeddings.ts re-exports it unchanged so its two real
 * call sites (moderation.ts, db/queries/book-embedding.ts) don't need to
 * change their imports.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  // Vectors are already normalized (pooling: mean, normalize: true), so
  // dot product IS the cosine similarity - no need to divide by magnitudes.
  return dot;
}
