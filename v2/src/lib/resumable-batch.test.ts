import { describe, expect, it } from "vitest";
import { runResumableBatch } from "./resumable-batch";

interface FakeRow {
  id: number;
}

function makeFetcher(rows: FakeRow[]) {
  return async (afterId: number, limit: number): Promise<FakeRow[]> =>
    rows.filter((r) => r.id > afterId).slice(0, limit);
}

describe("runResumableBatch", () => {
  it("processes every row across multiple batches and reports done", async () => {
    const rows = Array.from({ length: 23 }, (_, i) => ({ id: i + 1 }));
    const processed: number[] = [];

    const result = await runResumableBatch(
      makeFetcher(rows),
      async (item) => {
        processed.push(item.id);
      },
      { lastId: 0 },
      10,
    );

    expect(processed).toEqual(rows.map((r) => r.id));
    expect(result.processedCount).toBe(23);
    expect(result.done).toBe(true);
    expect(result.cursor.lastId).toBe(23);
  });

  it("advances the cursor only after a full batch, in order, never skipping or reordering", async () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({ id: (i + 1) * 10 }));
    const processed: number[] = [];

    await runResumableBatch(
      makeFetcher(rows),
      async (item) => {
        processed.push(item.id);
      },
      { lastId: 0 },
      3,
    );

    expect(processed).toEqual([10, 20, 30, 40, 50, 60, 70]);
  });

  it("resuming from a saved cursor picks up exactly where it left off, no duplicates", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const processedFirstRun: number[] = [];

    const firstRun = await runResumableBatch(
      makeFetcher(rows),
      async (item) => {
        processedFirstRun.push(item.id);
      },
      { lastId: 0 },
      4,
      1, // only one batch this call
    );

    expect(processedFirstRun).toEqual([1, 2, 3, 4]);
    expect(firstRun.done).toBe(false);
    expect(firstRun.cursor.lastId).toBe(4);

    const processedSecondRun: number[] = [];
    const secondRun = await runResumableBatch(
      makeFetcher(rows),
      async (item) => {
        processedSecondRun.push(item.id);
      },
      firstRun.cursor,
      4,
    );

    expect(processedSecondRun).toEqual([5, 6, 7, 8, 9, 10]);
    expect(secondRun.done).toBe(true);
    // Combined, every id was processed exactly once - no gaps, no duplicates.
    expect([...processedFirstRun, ...processedSecondRun]).toEqual(rows.map((r) => r.id));
  });

  it("retrying with the same pre-batch cursor after a simulated mid-batch crash cleanly reprocesses that whole batch, not a partial one", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
    const attempts: number[] = [];
    let shouldFailOnItem3 = true;

    const crashingProcessor = async (item: FakeRow) => {
      attempts.push(item.id);
      if (item.id === 3 && shouldFailOnItem3) {
        shouldFailOnItem3 = false;
        throw new Error("simulated crash mid-batch");
      }
    };

    const cursor = { lastId: 0 };

    await expect(
      runResumableBatch(makeFetcher(rows), crashingProcessor, cursor, 5),
    ).rejects.toThrow("simulated crash mid-batch");

    // Nothing after the crash ran, and the cursor passed in was never mutated
    // by the failed attempt (the caller only ever gets the returned cursor).
    expect(attempts).toEqual([1, 2, 3]);
    expect(cursor.lastId).toBe(0);

    // Retry with the same pre-batch cursor - the whole batch reprocesses
    // cleanly from the start, not from where it crashed.
    const retryResult = await runResumableBatch(makeFetcher(rows), crashingProcessor, cursor, 5);
    expect(attempts).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
    expect(retryResult.done).toBe(true);
    expect(retryResult.cursor.lastId).toBe(5);
  });

  it("respects maxBatches, stopping partway through and reporting done: false", async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
    const processed: number[] = [];

    const result = await runResumableBatch(
      makeFetcher(rows),
      async (item) => {
        processed.push(item.id);
      },
      { lastId: 0 },
      10,
      3,
    );

    expect(processed).toHaveLength(30);
    expect(result.processedCount).toBe(30);
    expect(result.done).toBe(false);
    expect(result.cursor.lastId).toBe(30);
  });

  it("reports done immediately with zero processed when there is nothing to do", async () => {
    const result = await runResumableBatch(
      makeFetcher([]),
      async () => {},
      { lastId: 0 },
      10,
    );

    expect(result.processedCount).toBe(0);
    expect(result.done).toBe(true);
    expect(result.cursor.lastId).toBe(0);
  });

  it("treats a final short batch (fewer rows than batchSize) as done, without an extra fetch", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));
    let fetchCount = 0;
    const countingFetcher = async (afterId: number, limit: number) => {
      fetchCount++;
      return rows.filter((r) => r.id > afterId).slice(0, limit);
    };

    const result = await runResumableBatch(countingFetcher, async () => {}, { lastId: 0 }, 10);

    expect(fetchCount).toBe(1);
    expect(result.done).toBe(true);
    expect(result.processedCount).toBe(5);
  });
});
