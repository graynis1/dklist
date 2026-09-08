import "server-only";
import { desc, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { errorLog } from "@/db/schema";

/**
 * Real customer ask (2026-09-08): a persistent, queryable error log, not
 * just `docker logs` (unstructured, unsearchable, lost on restart/rotation).
 * Wired into Next.js's own `onRequestError` instrumentation hook (catches
 * Server Component/Route Handler/Server Action errors) and a client-side
 * `global-error.tsx` boundary. Deliberately never throws itself - a broken
 * error logger must never mask or replace the real error it's trying to
 * record.
 */
export async function logServerError(input: {
  message: string;
  stack?: string | null;
  url?: string | null;
  method?: string | null;
  userId?: number | null;
  source?: "server" | "client";
  digest?: string | null;
}): Promise<void> {
  try {
    await db.insert(errorLog).values({
      message: input.message.slice(0, 5000),
      stack: input.stack ? input.stack.slice(0, 20000) : null,
      url: input.url ? input.url.slice(0, 1000) : null,
      method: input.method ?? null,
      userId: input.userId ?? null,
      source: input.source ?? "server",
      digest: input.digest ?? null,
      createdDate: new Date().toISOString().slice(0, 19).replace("T", " "),
    });
  } catch (err) {
    // Never let a logging failure become a second, masking error.
    console.error("[error-log] failed to persist error record:", err);
  }
}

export interface ErrorLogEntry {
  id: number;
  message: string;
  stack: string | null;
  url: string | null;
  method: string | null;
  userId: number | null;
  source: string;
  digest: string | null;
  createdDate: string;
}

/** Admin-only browse - most recent first, capped to a sane window rather
 * than growing unbounded on the admin page itself (the table can grow
 * without bound; cleanup is a separate, deliberate decision, not silently
 * done here). */
export async function getRecentErrors(limit = 100): Promise<ErrorLogEntry[]> {
  const safeLimit = Math.min(500, Math.max(1, limit));
  return db.select().from(errorLog).orderBy(desc(errorLog.id)).limit(safeLimit);
}

export interface ErrorLogGroup {
  digest: string | null;
  message: string;
  count: number;
  lastSeen: string;
  firstSeen: string;
}

/** Grouped-by-digest view - the same underlying bug fires repeatedly
 * (every request that hits it), so a flat recent-errors list mostly shows
 * N copies of the same thing. This is the "what's actually happening"
 * view an admin would want first. */
export async function getRecentErrorGroups(sinceHours = 24): Promise<ErrorLogGroup[]> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  const rows = await db
    .select({
      digest: errorLog.digest,
      message: sql<string>`min(${errorLog.message})`,
      count: sql<number>`count(*)`,
      lastSeen: sql<string>`max(${errorLog.createdDate})`,
      firstSeen: sql<string>`min(${errorLog.createdDate})`,
    })
    .from(errorLog)
    .where(gte(errorLog.createdDate, since))
    .groupBy(errorLog.digest, errorLog.message)
    .orderBy(desc(sql`count(*)`))
    .limit(50);
  return rows.map((r) => ({ ...r, count: Number(r.count) }));
}

/** Cleanup - keeps the table from growing unbounded forever. Not scheduled
 * automatically (no cron infra for this exists yet); exposed for a manual
 * admin action instead. */
export async function deleteErrorsOlderThan(days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  const [result] = await db.delete(errorLog).where(sql`${errorLog.createdDate} < ${cutoff}`);
  return result.affectedRows;
}
