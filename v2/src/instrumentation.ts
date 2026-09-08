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

/**
 * Real customer ask (2026-09-08): "sisteme çok geniş kapsamlı bir error
 * log da koy" (put a comprehensive error log into the system) - the only
 * error visibility that existed before this was `docker logs` (unstructured,
 * unsearchable, gone after a restart/rotation). Next.js's own official hook
 * for this - catches errors from Server Components, Route Handlers, and
 * Server Actions with real request context. `err` may be React's processed
 * version rather than the original throw, which is exactly what `digest`
 * is for (see this file's own doc comment reference, and Next's own docs).
 * Still `console.error`s too - this is additive, not a replacement for the
 * existing log stream.
 */
export const onRequestError: import("next").Instrumentation.onRequestError = async (err, request) => {
  console.error("[onRequestError]", request.path, err);
  const { logServerError } = await import("@/db/queries/error-log");
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? (err.stack ?? null) : null;
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : null;
  await logServerError({ message, stack, url: request.path, method: request.method, source: "server", digest });
};
