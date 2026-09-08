"use server";

import { logServerError } from "@/db/queries/error-log";

/** Counterpart to instrumentation.ts's `onRequestError` for errors that
 * only happen client-side after hydration (a render crash caught by
 * global-error.tsx) - those never reach the server-side hook at all. */
export async function logClientErrorAction(message: string, stack: string | null, digest: string | null, url: string): Promise<void> {
  await logServerError({ message, stack, url, source: "client", digest });
}
