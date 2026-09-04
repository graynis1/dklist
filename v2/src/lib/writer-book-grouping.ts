/**
 * Pure grouping/selection logic behind `WriterBookGrid` (writer-book-grid.tsx).
 * Extracted so the "which edition becomes the front tile, which ones collapse
 * behind the +N toggle, and what order do groups render in" rules are
 * unit-testable without a DOM - same "extract the pure decision logic out of
 * a client component" pattern already used elsewhere in this project (e.g.
 * the sunburst clip-path math extracted out of ProfileFrameRing).
 *
 * Customer ask this closes: "Orijinal kitap yada en yüksek puanı alan baskı
 * ön yüzde görünüp çevirileri onun üstüne tıklanınca açılabilir" - a writer
 * with one real book but many printings/translations in the catalog should
 * show one card per real work, not one tile per catalog row.
 */

export interface GroupableBook {
  id: number;
  score: number;
  viewCount: number;
  originalBookId: number | null;
}

export interface BookGroup<T extends GroupableBook> {
  front: T;
  others: T[];
  maxViewCount: number;
}

/**
 * Groups by `originalBookId` (falling back to the book's own id when it has
 * none, i.e. it IS an original) - two rows with different `originalBookId`
 * values never merge, and a row with no explicit original forms its own
 * singleton group unless something else points at it.
 *
 * Within a group, the "front" edition is: the row with no `originalBookId`
 * (the catalog's own root/original row) if one is present, otherwise the
 * highest-scoring row (first one wins ties, since `others` is derived by
 * excluding whichever id was picked as `front` - matters when two rows in
 * the same group share the same score). Groups are sorted by their highest
 * `viewCount` across all member rows, descending.
 */
export function groupWriterBooks<T extends GroupableBook>(books: T[]): BookGroup<T>[] {
  const groups = new Map<number, T[]>();
  for (const b of books) {
    const key = b.originalBookId ?? b.id;
    const list = groups.get(key) ?? [];
    list.push(b);
    groups.set(key, list);
  }

  return Array.from(groups.values())
    .map((items) => {
      const front = items.find((b) => b.originalBookId === null) ?? items.reduce((a, c) => (c.score > a.score ? c : a));
      const others = items.filter((b) => b.id !== front.id);
      return { front, others, maxViewCount: Math.max(...items.map((b) => b.viewCount)) };
    })
    .sort((a, b) => b.maxViewCount - a.maxViewCount);
}
