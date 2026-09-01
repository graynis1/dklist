import { describe, expect, it } from "vitest";
import { pageWindow } from "./pagination";

describe("pageWindow", () => {
  it("never returns more items than lastPage, even for a huge lastPage far past size", () => {
    // The real bug this function fixes: admin/public lists on writer/translator
    // (millions of rows) used to render Array.from({ length: lastPage }) directly,
    // freezing the page. Any window must stay bounded regardless of table size.
    const win = pageWindow(1, 100_000);
    expect(win).toHaveLength(10);
    expect(win).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("returns every page when lastPage is smaller than the window size", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });

  it("returns an empty window when there are no pages at all", () => {
    expect(pageWindow(1, 0)).toEqual([]);
  });

  it("centers the window on the current page in the middle of a large range", () => {
    expect(pageWindow(50_000, 100_000)).toEqual([
      49_995, 49_996, 49_997, 49_998, 49_999, 50_000, 50_001, 50_002, 50_003, 50_004,
    ]);
  });

  it("clamps the window to the last page instead of running past it", () => {
    expect(pageWindow(100_000, 100_000)).toEqual([
      99_991, 99_992, 99_993, 99_994, 99_995, 99_996, 99_997, 99_998, 99_999, 100_000,
    ]);
  });

  it("clamps a page number given past lastPage the same way as the last real page", () => {
    expect(pageWindow(200_000, 100_000)).toEqual(pageWindow(100_000, 100_000));
  });

  it("clamps a page number of 0 or negative the same way as page 1", () => {
    expect(pageWindow(0, 100_000)).toEqual(pageWindow(1, 100_000));
    expect(pageWindow(-5, 100_000)).toEqual(pageWindow(1, 100_000));
  });

  it("respects a custom window size", () => {
    expect(pageWindow(5, 100, 1)).toEqual([5]);
    expect(pageWindow(5, 100, 3)).toEqual([4, 5, 6]);
  });

  it("returned page numbers are always contiguous and ascending", () => {
    const win = pageWindow(42, 500, 7);
    for (let i = 1; i < win.length; i++) {
      expect(win[i]).toBe(win[i - 1] + 1);
    }
  });
});
