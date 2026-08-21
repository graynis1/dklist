/**
 * Generic resumable/checkpointed batch runner - the piece PLAN.md's Phase 5
 * notes flag as needed before the real work_id backfill can run against the
 * live ~98.5M-row `book` table ("must be batched/chunked, resumable/
 * idempotent (checkpointed by last-processed id) ... treat it as its own
 * risk item, not an incidental migration step").
 *
 * Deliberately domain-agnostic: it doesn't know about `book` or `work_id` at
 * all, doesn't touch prod, and doesn't persist the cursor itself - the
 * caller owns where the checkpoint lives (a DB row, a file, whatever fits
 * once the real backfill job is actually designed). That keeps this a safe,
 * reusable primitive rather than a half-built version of the real job.
 */

export interface BatchCursor {
  /** Last successfully processed id - resuming means "start after this". */
  lastId: number;
}

export interface BatchRunResult {
  cursor: BatchCursor;
  processedCount: number;
  done: boolean;
}

/**
 * Runs batches of `batchSize` starting after `cursor.lastId`, calling
 * `processItem` for each row and advancing the cursor only after the whole
 * batch succeeds. `maxBatches` caps how many batches run in a single call
 * (undefined = run until exhausted) - the caller decides how much work fits
 * in one invocation (a request, a cron tick, a manual step) and persists the
 * returned cursor for the next one. Idempotent by construction: re-running
 * with the same cursor after a real crash mid-batch just reprocesses that
 * one batch, nothing before it and nothing skipped after it.
 */
export async function runResumableBatch<T extends { id: number }>(
  fetchBatch: (afterId: number, limit: number) => Promise<T[]>,
  processItem: (item: T) => Promise<void>,
  cursor: BatchCursor,
  batchSize: number,
  maxBatches?: number,
): Promise<BatchRunResult> {
  let current = cursor;
  let processedCount = 0;
  let batchesRun = 0;

  while (maxBatches === undefined || batchesRun < maxBatches) {
    const batch = await fetchBatch(current.lastId, batchSize);
    if (batch.length === 0) {
      return { cursor: current, processedCount, done: true };
    }

    for (const item of batch) {
      await processItem(item);
    }

    current = { lastId: batch[batch.length - 1].id };
    processedCount += batch.length;
    batchesRun++;

    if (batch.length < batchSize) {
      // Fetched fewer than a full batch - this was the last page.
      return { cursor: current, processedCount, done: true };
    }
  }

  return { cursor: current, processedCount, done: false };
}
