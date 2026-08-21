import "server-only";
import { updateTag, cacheLife, cacheTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { read } from "@/db/schema";
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

  if (status === "yarida-birakildi" && !dropReason) {
    throw new Error("dropReason is required when status is yarida-birakildi");
  }

  const year = String(new Date().getFullYear());
  const values = {
    userId,
    bookId,
    status,
    year,
    dropReason: status === "yarida-birakildi" ? (dropReason ?? null) : null,
    dropPercentage: status === "yarida-birakildi" ? (dropPercentage ?? null) : null,
  };

  await db
    .insert(read)
    .values(values)
    .onDuplicateKeyUpdate({ set: values });

  // updateTag, not revalidateTag: this is a read-your-own-write path (called
  // from a Server Action) and revalidateTag's "max" stale-while-revalidate
  // window meant the aggregate below kept serving the pre-write value on the
  // very next request in testing - confirmed as a real bug, not a hypothetical
  // ("1 kişi bıraktı" didn't appear until well after the write). updateTag
  // expires it immediately.
  updateTag(`book-drop-stats:${bookId}`);
  updateTag(`profile-books:${userId}`);
  updateTag(`book-readers:${bookId}`);

  if (status === "okudum") {
    await awardPoints(userId, (await getPointSettings()).bookRead, "book_read", `read:book:${bookId}`);
  }
}

/**
 * Customer's "general reading-time tracking also wanted" (tacked onto the
 * dropped-status ask, easy to miss - caught on a second, closer pass of the
 * requirements). No session/timer infra exists or is planned - a manual
 * "log N minutes" entry is the honest minimal version, cumulative on the
 * existing `read` row. Creates an "okuyorum" row if none exists yet
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
    .values({ userId, bookId, status: "okuyorum", year, minutesRead: minutes })
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
    .where(and(eq(read.bookId, bookId), eq(read.status, "yarida-birakildi")))
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
