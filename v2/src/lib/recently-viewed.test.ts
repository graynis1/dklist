import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addRecentlyViewedBook, getRecentlyViewedBooks, type RecentlyViewedBook } from "./recently-viewed";

const STORAGE_KEY = "dklist_recently_viewed";

function book(id: number, overrides: Partial<RecentlyViewedBook> = {}): RecentlyViewedBook {
  return {
    id,
    name: `Kitap ${id}`,
    slug: `kitap-${id}`,
    hasImage: false,
    writers: ["Yazar Adı"],
    ...overrides,
  };
}

// No jsdom in this project's vitest setup (default node environment) - the
// module already branches on `typeof window === "undefined"` for real SSR
// safety, so exercising the actual localStorage-backed logic just needs a
// minimal `window.localStorage` stand-in, not a full DOM.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

describe("recently-viewed (window undefined - SSR)", () => {
  it("getRecentlyViewedBooks returns an empty array when window is undefined", () => {
    expect(getRecentlyViewedBooks()).toEqual([]);
  });

  it("addRecentlyViewedBook is a silent no-op when window is undefined", () => {
    expect(() => addRecentlyViewedBook(book(1))).not.toThrow();
  });
});

describe("recently-viewed (with a window.localStorage stand-in)", () => {
  let originalWindow: unknown;

  beforeEach(() => {
    originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = { localStorage: new MemoryStorage() };
  });

  afterEach(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
  });

  it("returns an empty array when nothing has been stored yet", () => {
    expect(getRecentlyViewedBooks()).toEqual([]);
  });

  it("records a viewed book and reads it back", () => {
    addRecentlyViewedBook(book(1));
    expect(getRecentlyViewedBooks()).toEqual([book(1)]);
  });

  it("puts the most-recently-viewed book first", () => {
    addRecentlyViewedBook(book(1));
    addRecentlyViewedBook(book(2));
    addRecentlyViewedBook(book(3));
    expect(getRecentlyViewedBooks().map((b) => b.id)).toEqual([3, 2, 1]);
  });

  it("de-duplicates by id, moving the re-viewed book back to the front without a duplicate entry", () => {
    addRecentlyViewedBook(book(1));
    addRecentlyViewedBook(book(2));
    addRecentlyViewedBook(book(1, { name: "Kitap 1 (güncel)" }));

    const result = getRecentlyViewedBooks();
    expect(result.map((b) => b.id)).toEqual([1, 2]);
    expect(result[0].name).toBe("Kitap 1 (güncel)");
  });

  it("caps history at 12 items, dropping the oldest", () => {
    for (let id = 1; id <= 13; id++) {
      addRecentlyViewedBook(book(id));
    }
    const result = getRecentlyViewedBooks();
    expect(result).toHaveLength(12);
    expect(result.map((b) => b.id)).toEqual([13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    expect(result.some((b) => b.id === 1)).toBe(false);
  });

  it("returns an empty array instead of throwing when stored JSON is corrupted", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(getRecentlyViewedBooks()).toEqual([]);
  });

  it("returns an empty array when the stored value isn't an array", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: "an array" }));
    expect(getRecentlyViewedBooks()).toEqual([]);
  });

  it("does not throw when localStorage.setItem throws (e.g. private browsing / quota exceeded)", () => {
    window.localStorage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    expect(() => addRecentlyViewedBook(book(1))).not.toThrow();
  });

  it("does not throw when localStorage.getItem throws", () => {
    window.localStorage.getItem = () => {
      throw new Error("SecurityError");
    };
    expect(getRecentlyViewedBooks()).toEqual([]);
  });
});
