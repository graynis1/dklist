import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export interface CategoryBookListItem {
  id: number;
  name: string;
  viewCount: number;
}

/**
 * Books in a category, ranked by view count. Ported from v1's raw-SQL fix for a
 * catastrophic query plan (MySQL's optimizer otherwise flattens the category
 * EXISTS check back into a join-then-filesort over the category's full row set -
 * confirmed via a fresh EXPLAIN against the live 98.5M-row book table on
 * 2026-08-20: STRAIGHT_JOIN + FORCE INDEX yields a backward index scan on
 * idx_book_viewcount with zero filesort, `rows` bounded by LIMIT). Do not
 * rewrite this with Drizzle's query builder / relational API - the builder
 * does not expose STRAIGHT_JOIN or FORCE INDEX, and a "cleaner" rewrite here
 * is exactly the kind of change that reintroduces the original incident.
 */
export async function getBooksByCategory(
  categoryId: number,
  limit = 40,
): Promise<CategoryBookListItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`category-books:${categoryId}`);

  const rows = await db.execute(sql`
    SELECT STRAIGHT_JOIN b.id, b.name, b.view_count AS viewCount
    FROM book b FORCE INDEX (idx_book_viewcount)
    WHERE EXISTS (
      SELECT 1 FROM book_category bc
      WHERE bc.book_id = b.id AND bc.category_id = ${categoryId}
    )
    ORDER BY b.view_count DESC
    LIMIT ${limit}
  `);

  return rows[0] as unknown as CategoryBookListItem[];
}
