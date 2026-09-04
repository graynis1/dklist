import { describe, expect, it } from "vitest";
import { groupWriterBooks, type GroupableBook } from "./writer-book-grouping";

function book(overrides: Partial<GroupableBook> & { id: number }): GroupableBook {
  return { score: 0, viewCount: 0, originalBookId: null, ...overrides };
}

describe("groupWriterBooks", () => {
  it("keeps unrelated books (no shared originalBookId) in separate singleton groups", () => {
    const books = [book({ id: 1 }), book({ id: 2 })];
    const groups = groupWriterBooks(books);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.front.id).sort()).toEqual([1, 2]);
    expect(groups.every((g) => g.others.length === 0)).toBe(true);
  });

  it("groups an original and its editions under one entry, editions collapsed into others", () => {
    const original = book({ id: 1, originalBookId: null, viewCount: 5 });
    const editionA = book({ id: 2, originalBookId: 1, viewCount: 3 });
    const editionB = book({ id: 3, originalBookId: 1, viewCount: 1 });
    const groups = groupWriterBooks([original, editionA, editionB]);

    expect(groups).toHaveLength(1);
    expect(groups[0].front.id).toBe(1);
    expect(groups[0].others.map((b) => b.id).sort()).toEqual([2, 3]);
  });

  it("prefers the row with no originalBookId as the front, even if an edition scores higher", () => {
    const original = book({ id: 1, originalBookId: null, score: 2 });
    const highScoringEdition = book({ id: 2, originalBookId: 1, score: 9 });
    const groups = groupWriterBooks([original, highScoringEdition]);

    expect(groups[0].front.id).toBe(1);
    expect(groups[0].others.map((b) => b.id)).toEqual([2]);
  });

  it("falls back to the highest-scoring row as front when no row in the group has a null originalBookId", () => {
    // e.g. the writer's book list only contains editions, the root row itself
    // isn't in this writer's catalog slice.
    const low = book({ id: 2, originalBookId: 1, score: 3 });
    const high = book({ id: 3, originalBookId: 1, score: 8 });
    const groups = groupWriterBooks([low, high]);

    expect(groups[0].front.id).toBe(3);
    expect(groups[0].others.map((b) => b.id)).toEqual([2]);
  });

  it("breaks a front-selection score tie by keeping the first row encountered", () => {
    const first = book({ id: 2, originalBookId: 1, score: 5 });
    const second = book({ id: 3, originalBookId: 1, score: 5 });
    const groups = groupWriterBooks([first, second]);

    expect(groups[0].front.id).toBe(2);
    expect(groups[0].others.map((b) => b.id)).toEqual([3]);
  });

  it("computes maxViewCount across every row in the group, not just the front row", () => {
    const original = book({ id: 1, originalBookId: null, viewCount: 1 });
    const popularEdition = book({ id: 2, originalBookId: 1, viewCount: 99 });
    const groups = groupWriterBooks([original, popularEdition]);

    expect(groups[0].maxViewCount).toBe(99);
  });

  it("sorts groups by maxViewCount descending", () => {
    const lessPopular = book({ id: 1, viewCount: 10 });
    const morePopular = book({ id: 2, viewCount: 500 });
    const groups = groupWriterBooks([lessPopular, morePopular]);

    expect(groups.map((g) => g.front.id)).toEqual([2, 1]);
  });

  it("returns an empty array for an empty input", () => {
    expect(groupWriterBooks([])).toEqual([]);
  });

  it("handles a single book with no editions", () => {
    const groups = groupWriterBooks([book({ id: 1, viewCount: 7 })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].front.id).toBe(1);
    expect(groups[0].others).toEqual([]);
    expect(groups[0].maxViewCount).toBe(7);
  });
});
