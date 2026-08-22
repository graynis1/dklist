const STORAGE_KEY = "dklist_recently_viewed";
const MAX_ITEMS = 12;

export interface RecentlyViewedBook {
  id: number;
  name: string;
  slug: string;
  writers: string[];
}

/**
 * Per-browser recently-viewed book history - deliberately localStorage-only,
 * no DB/schema involved. This is a lightweight per-viewer convenience (like
 * the pattern used for other client-only UI state in this app), not data
 * that needs to survive across devices or be readable server-side.
 */
export function addRecentlyViewedBook(book: RecentlyViewedBook): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentlyViewedBooks().filter((b) => b.id !== book.id);
    const updated = [book, ...existing].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Private browsing / storage disabled / quota exceeded - not worth failing over.
  }
}

export function getRecentlyViewedBooks(): RecentlyViewedBook[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}
