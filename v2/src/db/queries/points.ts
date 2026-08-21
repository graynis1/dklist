import "server-only";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { pointTransaction, weeklyWinner, user, book } from "@/db/schema";
import { currentISOWeek, getISOWeekRange } from "@/lib/iso-week";

/**
 * Gamification/engagement points - a customer-requested new feature (v1 has
 * no points/leaderboard concept at all, so there's nothing to port here;
 * point values and rules below are a fresh design). Every user-facing action
 * (marking a book read, writing a comment, rating, liking) calls
 * awardPoints() with a `reasonKey` that's constant for togglable states
 * (so re-toggling the same state doesn't re-earn) but naturally unique per
 * row for creation events (a real new comment always deserves its points).
 * The DB's own UNIQUE(user_id, reason_key) constraint makes this atomically
 * idempotent under concurrency, not just a check-then-insert race.
 */
export const POINT_VALUES = {
  bookRead: 10,
  comment: 5,
  rating: 2,
  like: 1,
} as const;

export async function awardPoints(
  userId: number,
  points: number,
  reason: string,
  reasonKey: string,
): Promise<void> {
  try {
    await db.insert(pointTransaction).values({
      userId,
      points,
      reason,
      reasonKey,
      createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    });
  } catch (err) {
    // Duplicate reasonKey for this user = already awarded for this exact
    // action instance (e.g. toggling "okudum" off then back on for the same
    // book) - silently a no-op, not an error the caller needs to see.
    const message = (err as Error).message ?? "";
    if (!message.includes("uq_point_transaction_user_reason_key") && !message.includes("Duplicate entry")) {
      throw err;
    }
  }
}

export async function getUserTotalPoints(userId: number): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${pointTransaction.points}), 0)` })
    .from(pointTransaction)
    .where(eq(pointTransaction.userId, userId));
  return Number(row?.total ?? 0);
}

export interface LeaderboardEntry {
  userId: number;
  username: string;
  image: string | null;
  points: number;
}

/** Ranks users by points earned within the given ISO week (defaults to the
 * current week) - "Bu haftanın lideri" / the public leaderboard page. */
export async function getWeeklyLeaderboard(
  limit = 20,
  yearWeek: string = currentISOWeek(),
): Promise<LeaderboardEntry[]> {
  const { start, end } = getISOWeekRange(yearWeek);
  const startStr = start.toISOString().slice(0, 19).replace("T", " ");
  const endStr = end.toISOString().slice(0, 19).replace("T", " ");

  const rows = await db
    .select({
      userId: pointTransaction.userId,
      username: user.username,
      image: user.image,
      points: sql<number>`sum(${pointTransaction.points})`,
    })
    .from(pointTransaction)
    .innerJoin(user, eq(pointTransaction.userId, user.id))
    .where(and(gte(pointTransaction.createdAt, startStr), lt(pointTransaction.createdAt, endStr)))
    .groupBy(pointTransaction.userId, user.username, user.image)
    .orderBy(desc(sql`sum(${pointTransaction.points})`))
    .limit(limit);

  return rows.map((r) => ({ ...r, points: Number(r.points) }));
}

export interface WeeklyWinnerRecord {
  id: number;
  yearWeek: string;
  userId: number;
  username: string;
  points: number;
  prizeBookId: number | null;
  prizeBookName: string | null;
  fulfilled: boolean;
  fulfilledAt: string | null;
}

export async function getWeeklyWinner(yearWeek: string): Promise<WeeklyWinnerRecord | null> {
  const [row] = await db
    .select({
      id: weeklyWinner.id,
      yearWeek: weeklyWinner.yearWeek,
      userId: weeklyWinner.userId,
      username: user.username,
      points: weeklyWinner.points,
      prizeBookId: weeklyWinner.prizeBookId,
      prizeBookName: book.name,
      fulfilled: weeklyWinner.fulfilled,
      fulfilledAt: weeklyWinner.fulfilledAt,
    })
    .from(weeklyWinner)
    .innerJoin(user, eq(weeklyWinner.userId, user.id))
    .leftJoin(book, eq(weeklyWinner.prizeBookId, book.id))
    .where(eq(weeklyWinner.yearWeek, yearWeek))
    .limit(1);

  if (!row) return null;
  return { ...row, fulfilled: Boolean(row.fulfilled) };
}

export async function getPastWeeklyWinners(limit = 20): Promise<WeeklyWinnerRecord[]> {
  const rows = await db
    .select({
      id: weeklyWinner.id,
      yearWeek: weeklyWinner.yearWeek,
      userId: weeklyWinner.userId,
      username: user.username,
      points: weeklyWinner.points,
      prizeBookId: weeklyWinner.prizeBookId,
      prizeBookName: book.name,
      fulfilled: weeklyWinner.fulfilled,
      fulfilledAt: weeklyWinner.fulfilledAt,
    })
    .from(weeklyWinner)
    .innerJoin(user, eq(weeklyWinner.userId, user.id))
    .leftJoin(book, eq(weeklyWinner.prizeBookId, book.id))
    .orderBy(desc(weeklyWinner.yearWeek))
    .limit(limit);

  return rows.map((r) => ({ ...r, fulfilled: Boolean(r.fulfilled) }));
}

/**
 * Admin-only: records this week's leaderboard winner + which book the
 * system is gifting them. Deliberately manual (not a cron job) - actually
 * shipping a physical book is a real-world fulfillment action, not
 * something the app can automate, so an admin picks the winner's prize and
 * marks it done once it's actually sent.
 */
export async function recordWeeklyWinner(
  yearWeek: string,
  userId: number,
  points: number,
  prizeBookId: number | null,
): Promise<{ status: boolean; message?: string }> {
  const existing = await getWeeklyWinner(yearWeek);
  if (existing) {
    return { status: false, message: `${yearWeek} için kazanan zaten kayıtlı.` };
  }

  await db.insert(weeklyWinner).values({
    yearWeek,
    userId,
    points,
    prizeBookId,
    fulfilled: 0,
    createdAt: new Date().toISOString().slice(0, 19).replace("T", " "),
  });

  return { status: true };
}

export async function markWinnerFulfilled(id: number): Promise<void> {
  await db
    .update(weeklyWinner)
    .set({ fulfilled: 1, fulfilledAt: new Date().toISOString().slice(0, 19).replace("T", " ") })
    .where(eq(weeklyWinner.id, id));
}
