import "server-only";

/**
 * Local/self-hosted embeddings - maintainer's explicit call: no GPU-
 * dependent chatbot, no paid API, but a small embedding model is genuinely
 * practical (runs on CPU via ONNX, ~10ms per text once warm, no network
 * dependency after the one-time model download). Used for "Book DNA"
 * (content-based similar-book re-ranking), moderation (semantic similarity
 * to known-bad examples, on top of the existing keyword flagging), and
 * support-ticket-to-FAQ matching.
 *
 * Multilingual model (paraphrase-multilingual-MiniLM-L12-v2) rather than an
 * English-only one - this site's content/comments/tickets are Turkish, and
 * a quick manual comparison against an English-only model showed clearly
 * worse similarity separation on Turkish book descriptions.
 *
 * Loaded once via globalThis - same singleton pattern already used for
 * the mysql pool (src/db/index.ts) and the SSE event bus, for the
 * identical underlying reason: next dev's HMR re-evaluates this module on
 * nearly every file save, and re-loading a ~100MB ONNX model on every
 * save would make dev unusable.
 */

export const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

type FeatureExtractionPipeline = (
  text: string,
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ data: Float32Array | number[] }>;

const g = globalThis as unknown as { __dklistEmbedder?: Promise<FeatureExtractionPipeline> };

function loadEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!g.__dklistEmbedder) {
    g.__dklistEmbedder = import("@huggingface/transformers").then(({ pipeline }) =>
      pipeline("feature-extraction", EMBEDDING_MODEL) as unknown as Promise<FeatureExtractionPipeline>,
    );
  }
  return g.__dklistEmbedder;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const extractor = await loadEmbedder();
  const trimmed = text.trim().slice(0, 2000);
  if (!trimmed) return [];
  const output = await extractor(trimmed, { pooling: "mean", normalize: true });
  return Array.from(output.data as ArrayLike<number>);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  // Vectors are already normalized (pooling: mean, normalize: true), so
  // dot product IS the cosine similarity - no need to divide by magnitudes.
  return dot;
}
