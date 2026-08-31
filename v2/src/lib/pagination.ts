/**
 * Bounded page-number window - shared by every paginated list in the app.
 * Real bug found live: several admin lists (yazarlar/çevirmenler/yayınevleri/
 * kategoriler) rendered `Array.from({ length: lastPage })` directly with NO
 * bound at all - fine for a small table, but `writer`/`translator` etc. have
 * millions of rows, so `lastPage` there is in the hundreds of thousands.
 * Rendering that many <Link> elements in one page effectively froze the
 * page - exactly what the customer reported as "sayfa sayılarının üzerine
 * tıklanmıyor" (page numbers don't respond to clicks). The public listing
 * pages (kitaplar/çevirmenler/yayınevleri) already had their own local copy
 * of this exact function - centralized here so it can never be forgotten
 * again on a new list page.
 */
export function pageWindow(page: number, lastPage: number, size = 10): number[] {
  const start = Math.max(1, Math.min(page - Math.floor(size / 2), lastPage - size + 1));
  const end = Math.min(lastPage, start + size - 1);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
}
