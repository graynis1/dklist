import "server-only";
import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { work, book } from "@/db/schema";

export type MergeResult =
  | { status: true; reassignedBooks: number }
  | { status: false; error: string };

/**
 * Merges `duplicateWorkId` into `canonicalWorkId`: every book pointing at the
 * duplicate is repointed to the canonical work, then the now-empty duplicate
 * work row is deleted. Transactional (all-or-nothing), same shape as v1's
 * `EntityMerger` (reassign-then-delete inside a DB transaction) but built for
 * the new `work` grouping table from the Phase 1 schema split rather than
 * v1's generic entity-table merger.
 *
 * This is the manual-merge half of Phase 1's plan. The other half - actually
 * *detecting* which works are duplicates - is Phase 5's fuzzy-matching
 * pipeline (see src/lib/dedup/, built separately). This function only does
 * the mechanical merge once two work ids are already known to be the same
 * underlying book.
 *
 * No role/permission gate yet (Phase 4 builds the real admin role system) -
 * callers must check the caller is signed in themselves for now.
 */
export async function mergeWorks(
  duplicateWorkId: number,
  canonicalWorkId: number,
): Promise<MergeResult> {
  if (duplicateWorkId === canonicalWorkId) {
    return { status: false, error: "Bir kaydı kendisiyle birleştiremezsiniz." };
  }

  return db.transaction(async (tx) => {
    const [canonical] = await tx
      .select({ id: work.id })
      .from(work)
      .where(eq(work.id, canonicalWorkId))
      .limit(1);
    const [duplicate] = await tx
      .select({ id: work.id })
      .from(work)
      .where(eq(work.id, duplicateWorkId))
      .limit(1);

    if (!canonical || !duplicate) {
      return { status: false, error: "Belirtilen work kayıtlarından biri bulunamadı." };
    }

    const result = await tx
      .update(book)
      .set({ workId: canonicalWorkId })
      .where(eq(book.workId, duplicateWorkId));

    await tx.delete(work).where(eq(work.id, duplicateWorkId));

    // Book pages cache by book id/slug, not work id directly, but a merge
    // changes which "shared rating" pool a book belongs to - once
    // score/comment tables are repointed to work_id (deferred, see the
    // migration file), this is where that invalidation will matter. Tagging
    // now so the call site doesn't need to change later.
    // Second arg is the stale-while-revalidate window (Next.js 16 requires it
    // explicitly) - "max" is fine here, a merge is rare/manual, not something
    // that needs sub-second freshness.
    revalidateTag(`work:${canonicalWorkId}`, "max");
    revalidateTag(`work:${duplicateWorkId}`, "max");

    const affectedRows = (result as unknown as [{ affectedRows: number }])[0]?.affectedRows ?? 0;
    return { status: true, reassignedBooks: affectedRows };
  });
}
