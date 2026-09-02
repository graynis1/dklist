import "server-only";
import { revalidateTag, updateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { work, book, writer, translator, publisher, user, score } from "@/db/schema";

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

/**
 * Customer's ask (2026-09-02): extend duplicate-record merging beyond books
 * to writer/translator/publisher - the same bulk-import-driven duplication
 * is just as real for those entities. Writer/translator are many-to-many
 * (writer_book/translator_book) plus generic comment/score/user_writer-
 * style like tables, so a straight UPDATE can hit a real PK/unique
 * conflict when a book (or user, or rater) is already linked to BOTH the
 * duplicate and the canonical record - `UPDATE IGNORE` skips exactly
 * those conflicting rows instead of failing the whole merge, and the
 * follow-up DELETE cleans up whatever IGNORE left behind (now genuinely
 * redundant once the writer/translator row is about to be deleted).
 * Publisher is a plain 1:many FK (book.publisherId) - no join-table
 * conflicts possible, only `user_publisher` needs the IGNORE treatment.
 */
export async function mergeWriters(duplicateId: number, canonicalId: number): Promise<MergeResult> {
  if (duplicateId === canonicalId) {
    return { status: false, error: "Bir kaydı kendisiyle birleştiremezsiniz." };
  }

  return db.transaction(async (tx) => {
    const [canonical] = await tx.select({ id: writer.id }).from(writer).where(eq(writer.id, canonicalId)).limit(1);
    const [duplicate] = await tx.select({ id: writer.id }).from(writer).where(eq(writer.id, duplicateId)).limit(1);
    if (!canonical || !duplicate) {
      return { status: false, error: "Belirtilen yazar kayıtlarından biri bulunamadı." };
    }

    const result = await tx.execute(sql`UPDATE IGNORE writer_book SET writer_id = ${canonicalId} WHERE writer_id = ${duplicateId}`);
    await tx.execute(sql`DELETE FROM writer_book WHERE writer_id = ${duplicateId}`);
    await tx.execute(sql`UPDATE IGNORE user_writer SET writer_id = ${canonicalId} WHERE writer_id = ${duplicateId}`);
    await tx.execute(sql`DELETE FROM user_writer WHERE writer_id = ${duplicateId}`);
    await tx.execute(sql`UPDATE IGNORE score SET target_id = ${canonicalId} WHERE target_id = ${duplicateId} AND target_type = 'writer'`);
    await tx.execute(sql`DELETE FROM score WHERE target_id = ${duplicateId} AND target_type = 'writer'`);
    await tx.execute(sql`UPDATE comment SET target_id = ${canonicalId} WHERE target_id = ${duplicateId} AND type = 'writer'`);

    // Yazarhane link (user.writer_id) is UNIQUE on writer_id, not user_id -
    // only move it over if the canonical doesn't already have one linked;
    // if both do, that's a genuine data conflict left for a human to
    // resolve by hand rather than silently dropping either link.
    const [dupUser] = await tx.select({ id: user.id }).from(user).where(eq(user.writerId, duplicateId)).limit(1);
    const [canonicalUser] = await tx.select({ id: user.id }).from(user).where(eq(user.writerId, canonicalId)).limit(1);
    if (dupUser && !canonicalUser) {
      await tx.update(user).set({ writerId: canonicalId }).where(eq(user.id, dupUser.id));
    }

    const [{ avg }] = await tx
      .select({ avg: sql<number>`avg(${score.score})` })
      .from(score)
      .where(and(eq(score.targetId, canonicalId), eq(score.targetType, "writer")));
    if (avg !== null) {
      await tx.update(writer).set({ score: avg }).where(eq(writer.id, canonicalId));
    }

    await tx.delete(writer).where(eq(writer.id, duplicateId));

    updateTag("admin-writer-list");
    revalidateTag(`writer:${canonicalId}`, "max");
    revalidateTag(`writer:${duplicateId}`, "max");

    const affectedRows = (result as unknown as [{ affectedRows: number }])[0]?.affectedRows ?? 0;
    return { status: true, reassignedBooks: affectedRows };
  });
}

export async function mergeTranslators(duplicateId: number, canonicalId: number): Promise<MergeResult> {
  if (duplicateId === canonicalId) {
    return { status: false, error: "Bir kaydı kendisiyle birleştiremezsiniz." };
  }

  return db.transaction(async (tx) => {
    const [canonical] = await tx.select({ id: translator.id }).from(translator).where(eq(translator.id, canonicalId)).limit(1);
    const [duplicate] = await tx.select({ id: translator.id }).from(translator).where(eq(translator.id, duplicateId)).limit(1);
    if (!canonical || !duplicate) {
      return { status: false, error: "Belirtilen çevirmen kayıtlarından biri bulunamadı." };
    }

    const result = await tx.execute(sql`UPDATE IGNORE translator_book SET translator_id = ${canonicalId} WHERE translator_id = ${duplicateId}`);
    await tx.execute(sql`DELETE FROM translator_book WHERE translator_id = ${duplicateId}`);
    await tx.execute(sql`UPDATE IGNORE user_translator SET translator_id = ${canonicalId} WHERE translator_id = ${duplicateId}`);
    await tx.execute(sql`DELETE FROM user_translator WHERE translator_id = ${duplicateId}`);
    await tx.execute(sql`UPDATE IGNORE score SET target_id = ${canonicalId} WHERE target_id = ${duplicateId} AND target_type = 'translator'`);
    await tx.execute(sql`DELETE FROM score WHERE target_id = ${duplicateId} AND target_type = 'translator'`);
    await tx.execute(sql`UPDATE comment SET target_id = ${canonicalId} WHERE target_id = ${duplicateId} AND type = 'translator'`);

    const [{ avg }] = await tx
      .select({ avg: sql<number>`avg(${score.score})` })
      .from(score)
      .where(and(eq(score.targetId, canonicalId), eq(score.targetType, "translator")));
    if (avg !== null) {
      await tx.update(translator).set({ score: avg }).where(eq(translator.id, canonicalId));
    }

    await tx.delete(translator).where(eq(translator.id, duplicateId));

    updateTag("admin-translator-list");
    revalidateTag(`translator:${canonicalId}`, "max");
    revalidateTag(`translator:${duplicateId}`, "max");

    const affectedRows = (result as unknown as [{ affectedRows: number }])[0]?.affectedRows ?? 0;
    return { status: true, reassignedBooks: affectedRows };
  });
}

/**
 * Simpler than writer/translator - publisher is a plain 1:many FK
 * (book.publisherId), so reassigning books can never hit a uniqueness
 * conflict. Deliberately does NOT reuse deletePublisher()'s cascade
 * (that ports v1's real Publisher::delete(), which DELETES every book -
 * correct for "remove this bad publisher record", completely wrong for
 * "these two records are the same publisher, keep the books").
 */
export async function mergePublishers(duplicateId: number, canonicalId: number): Promise<MergeResult> {
  if (duplicateId === canonicalId) {
    return { status: false, error: "Bir kaydı kendisiyle birleştiremezsiniz." };
  }

  return db.transaction(async (tx) => {
    const [canonical] = await tx.select({ id: publisher.id }).from(publisher).where(eq(publisher.id, canonicalId)).limit(1);
    const [duplicate] = await tx.select({ id: publisher.id }).from(publisher).where(eq(publisher.id, duplicateId)).limit(1);
    if (!canonical || !duplicate) {
      return { status: false, error: "Belirtilen yayınevi kayıtlarından biri bulunamadı." };
    }

    const result = await tx.update(book).set({ publisherId: canonicalId }).where(eq(book.publisherId, duplicateId));
    await tx.execute(sql`UPDATE IGNORE user_publisher SET publisher_id = ${canonicalId} WHERE publisher_id = ${duplicateId}`);
    await tx.execute(sql`DELETE FROM user_publisher WHERE publisher_id = ${duplicateId}`);

    await tx.delete(publisher).where(eq(publisher.id, duplicateId));

    updateTag("admin-publisher-list");
    revalidateTag(`publisher:${canonicalId}`, "max");
    revalidateTag(`publisher:${duplicateId}`, "max");

    const affectedRows = (result as unknown as [{ affectedRows: number }])[0]?.affectedRows ?? 0;
    return { status: true, reassignedBooks: affectedRows };
  });
}
