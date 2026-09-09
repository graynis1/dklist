import "server-only";
import { updateTag, cacheLife, cacheTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { read, readPurpose, book } from "@/db/schema";
import type { ReadStatus, DropReason, CurrentReadStatus } from "@/lib/reading-status";
import { awardPoints, getPointSettings } from "@/db/queries/points";

export {
  READ_STATUSES,
  DROP_REASONS,
  DROP_REASON_LABELS,
  type ReadStatus,
  type DropReason,
  type CurrentReadStatus,
} from "@/lib/reading-status";

export interface SetReadStatusInput {
  userId: number;
  bookId: number;
  status: ReadStatus;
  dropReason?: DropReason;
  dropPercentage?: number;
}

/**
 * Upserts the caller's reading status for a book - one current row per
 * user+book (see the UNIQUE constraint added in migration 0002). Deliberately
 * separate from "kitaplığım" (book ownership, `library_book` table) - the
 * customer's notes were explicit that owning a physical copy and having read
 * it are independent facts, and v1's schema already keeps them as separate
 * tables; this function only ever touches `read`.
 */
export async function setReadStatus(input: SetReadStatusInput): Promise<void> {
  const { userId, bookId, status, dropReason, dropPercentage } = input;

  if (status === "dropRead" && !dropReason) {
    throw new Error("dropReason is required when status is yarida-birakildi");
  }

  const year = String(new Date().getFullYear());
  const nowSql = new Date().toISOString().slice(0, 19).replace("T", " ");
  const values = {
    userId,
    bookId,
    status,
    year,
    dropReason: status === "dropRead" ? (dropReason ?? null) : null,
    dropPercentage: status === "dropRead" ? (dropPercentage ?? null) : null,
    // Customer's ask: "4 günde bitirdi" needs a real start date. Set once
    // on first becoming currentRead - COALESCE on the update path means a
    // later re-save (switching status back and forth) never overwrites an
    // already-recorded start.
    startedAt: status === "currentRead" || status === "finishRead" ? nowSql : null,
    finishedAt: status === "finishRead" ? nowSql : null,
  };

  await db
    .insert(read)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        status: values.status,
        dropReason: values.dropReason,
        dropPercentage: values.dropPercentage,
        startedAt: values.startedAt ? sql`COALESCE(${read.startedAt}, ${values.startedAt})` : sql`${read.startedAt}`,
        finishedAt: values.finishedAt ? sql`${values.finishedAt}` : sql`${read.finishedAt}`,
      },
    });

  // updateTag, not revalidateTag: this is a read-your-own-write path (called
  // from a Server Action) and revalidateTag's "max" stale-while-revalidate
  // window meant the aggregate below kept serving the pre-write value on the
  // very next request in testing - confirmed as a real bug, not a hypothetical
  // ("1 kişi bıraktı" didn't appear until well after the write). updateTag
  // expires it immediately.
  updateTag(`book-drop-stats:${bookId}`);
  updateTag(`profile-books:${userId}`);
  updateTag(`book-readers:${bookId}`);

  const settings = await getPointSettings();

  if (status === "finishRead") {
    await awardPoints(userId, settings.bookRead, "book_read", `read:book:${bookId}`);
    await maybeAwardGoalAchieved(userId, settings.readingGoalAchieved);
  } else if (status === "targetRead" || status === "currentRead") {
    // Customer's explicit ask (2026-09-07): "okudum-okuyacağım dediğinde"
    // should show up in the activity feed too, not just the finished-book
    // case - "yarıda bıraktım" deliberately excluded (their own "handikap
    // olmayacak kısımlar" caveat - a dropped book reads as more personal/
    // negative to broadcast than "started" or "want to read"). reasonKey is
    // per (user, book, status) so switching status back and forth doesn't
    // re-earn or re-post the same transition repeatedly.
    await awardPoints(userId, settings.readingStatusUpdate, "reading_status", `reading_status:${status}:${bookId}`);
  }
}

/**
 * Fires once per user per year, the moment a finished book pushes their
 * "okudum" count for the current year to (or past) their own set goal -
 * customer's explicit ask for a shareable "hedefe ulaştı" feed moment.
 * Cheap: two small, already-indexed lookups, only on the finishRead path.
 */
async function maybeAwardGoalAchieved(userId: number, points: number): Promise<void> {
  const year = String(new Date().getFullYear());
  const [[goalRow], [countRow]] = await Promise.all([
    db.select({ purposeCount: readPurpose.purposeCount }).from(readPurpose).where(and(eq(readPurpose.ownerId, userId), eq(readPurpose.year, year))).limit(1),
    db.select({ n: sql<number>`count(*)` }).from(read).where(and(eq(read.userId, userId), eq(read.year, year), eq(read.status, "finishRead"))),
  ]);
  if (!goalRow || countRow.n < goalRow.purposeCount) return;
  await awardPoints(userId, points, "reading_goal_achieved", `reading_goal_achieved:${userId}:${year}`);
}

/**
 * Customer's "general reading-time tracking also wanted" (tacked onto the
 * dropped-status ask, easy to miss - caught on a second, closer pass of the
 * requirements). No session/timer infra exists or is planned - a manual
 * "log N minutes" entry is the honest minimal version, cumulative on the
 * existing `read` row. Creates an "currentRead" row if none exists yet
 * (logging time implies active reading), otherwise just adds to whatever
 * status/year is already there rather than overwriting it.
 */
export async function addReadingMinutes(userId: number, bookId: number, minutes: number): Promise<void> {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    throw new Error("Dakika 1 ile 1440 arasında olmalıdır.");
  }

  const year = String(new Date().getFullYear());
  await db
    .insert(read)
    .values({ userId, bookId, status: "currentRead", year, minutesRead: minutes })
    .onDuplicateKeyUpdate({ set: { minutesRead: sql`${read.minutesRead} + ${minutes}` } });

  updateTag(`profile-books:${userId}`);
  updateTag(`reading-minutes:${userId}`);
}

/** Lifetime (or single-year) total, for the profile page and the DKList
 * Reading Score card's "Okuma Süresi" stat. */
export async function getTotalReadingMinutes(userId: number, year?: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${read.minutesRead}), 0)` })
    .from(read)
    .where(year ? and(eq(read.userId, userId), eq(read.year, year)) : eq(read.userId, userId));
  return Number(row?.total ?? 0);
}

/** Milestones deliberately stop at 75 - 100% is functionally "bitirdi",
 * already covered by the real "book_read" feed event on finishRead, a
 * second "100% tamamladı" post right next to it would be redundant. */
const PROGRESS_MILESTONES = [25, 50, 75] as const;

/**
 * Customer's ask (2026-09-09, reference screenshot): "137. sayfaya geldi
 * -> %42 tamamlandı" as a feed event. No page-progress tracking existed at
 * all before `current_page` (migration 0053) - this is genuinely new, not
 * a port. Requires an existing "currentRead" row (can't log progress on a
 * book you haven't started) and the book's own page count to compute a
 * percentage from. Fires a feed-worthy milestone at most once per (user,
 * book, milestone) - re-saving the same or a lower page never re-fires.
 */
export async function updateReadingProgress(userId: number, bookId: number, currentPage: number): Promise<void> {
  if (!Number.isInteger(currentPage) || currentPage < 1) {
    throw new Error("Sayfa numarası geçerli bir sayı olmalıdır.");
  }

  const [existing] = await db.select({ status: read.status }).from(read).where(and(eq(read.userId, userId), eq(read.bookId, bookId))).limit(1);
  if (!existing || existing.status !== "currentRead") {
    throw new Error("Sayfa ilerlemesi kaydetmek için önce kitabı 'Şu An Okuyorum' olarak işaretlemelisiniz.");
  }

  const [bookRow] = await db.select({ pageNumber: book.pageNumber }).from(book).where(eq(book.id, bookId)).limit(1);
  const totalPages = bookRow?.pageNumber ? Number(bookRow.pageNumber) : null;
  if (totalPages && currentPage > totalPages) {
    throw new Error(`Bu kitap ${totalPages} sayfa - girdiğiniz sayfa numarası bundan büyük olamaz.`);
  }

  await db.update(read).set({ currentPage }).where(and(eq(read.userId, userId), eq(read.bookId, bookId)));
  updateTag(`profile-books:${userId}`);

  if (!totalPages) return; // no page count on this book - percentage isn't computable, progress is still saved above
  const percentage = Math.floor((currentPage / totalPages) * 100);
  const crossed = PROGRESS_MILESTONES.filter((m) => percentage >= m);
  if (crossed.length === 0) return;

  const settings = await getPointSettings();
  const milestone = crossed[crossed.length - 1];
  await awardPoints(userId, settings.readingStatusUpdate, "reading_progress", `reading_progress:${bookId}:${milestone}`);
}

export async function clearReadStatus(userId: number, bookId: number): Promise<void> {
  await db.delete(read).where(and(eq(read.userId, userId), eq(read.bookId, bookId)));
  updateTag(`book-drop-stats:${bookId}`);
  updateTag(`profile-books:${userId}`);
  updateTag(`book-readers:${bookId}`);
}

/**
 * Deliberately NOT wrapped in `'use cache'` - this is cheap (single indexed
 * lookup on the new UNIQUE(user_id, book_id) key) and read right after the
 * user's own write in `setReadStatus`, so correctness (seeing your own
 * change immediately) matters more than shaving one query. Contrast with
 * `getBookDropStats` below, which aggregates across all users and is worth
 * caching since staleness there is invisible/acceptable.
 */
export async function getReadStatus(
  userId: number,
  bookId: number,
): Promise<CurrentReadStatus | null> {
  const [row] = await db
    .select({
      status: read.status,
      dropReason: read.dropReason,
      dropPercentage: read.dropPercentage,
    })
    .from(read)
    .where(and(eq(read.userId, userId), eq(read.bookId, bookId)))
    .limit(1);

  if (!row) return null;
  return row as CurrentReadStatus;
}

export interface BookDropStats {
  droppedCount: number;
  avgDropPercentage: number | null;
  reasonCounts: Partial<Record<DropReason, number>>;
}

/**
 * "Kitabı bırakma noktası" - the customer's explicit ask: an aggregate other
 * readers can see (how many people dropped this book, at roughly what point,
 * and why). Cached with a real lifetime since per-viewer freshness doesn't
 * matter here, unlike getReadStatus above.
 */
export async function getBookDropStats(bookId: number): Promise<BookDropStats> {
  "use cache";
  cacheLife("hours");
  cacheTag(`book-drop-stats:${bookId}`);

  const rows = await db
    .select({
      dropReason: read.dropReason,
      count: sql<number>`count(*)`,
      avgPct: sql<number | null>`avg(${read.dropPercentage})`,
    })
    .from(read)
    .where(and(eq(read.bookId, bookId), eq(read.status, "dropRead")))
    .groupBy(read.dropReason);

  const reasonCounts: Partial<Record<DropReason, number>> = {};
  let droppedCount = 0;
  let weightedPctSum = 0;

  for (const row of rows) {
    droppedCount += row.count;
    if (row.dropReason) {
      reasonCounts[row.dropReason as DropReason] = row.count;
    }
    if (row.avgPct != null) {
      weightedPctSum += row.avgPct * row.count;
    }
  }

  return {
    droppedCount,
    avgDropPercentage: droppedCount > 0 ? Math.round(weightedPctSum / droppedCount) : null,
    reasonCounts,
  };
}
