/**
 * Warms up the local embedding model (Book DNA / moderation, see
 * src/lib/embeddings.ts) once at server startup, instead of paying the
 * ~3-10s ONNX model load cost on whichever request happens to be first -
 * a real gap found via testing: the very first comment/message after a
 * fresh server start took 20+ seconds to moderate, since checkModeration
 * blocked on the cold model load. Safe to run at startup since this app
 * is a long-lived `next start` process (see PLAN.md's "Next.js hosting"
 * decision), not a serverless function where a slow cold start would
 * repeat on every invocation anyway.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEmbedding } = await import("@/lib/embeddings");
    getEmbedding("başlangıç ısınma isteği").catch((err) => {
      console.error("[instrumentation] embedding model warm-up failed:", err);
    });
  }
}
