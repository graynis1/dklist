import "server-only";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { pointTransaction, weeklyWinner, user, book, badges, userBadges, pointSetting } from "@/db/schema";
import { currentISOWeek, getISOWeekRange } from "@/lib/iso-week";
import { addNotification } from "@/db/queries/notifications";
import { isUserPremium } from "@/db/queries/premium";

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
  follow: 1,
  libraryAdd: 1,
  blogPublished: 8,
  storeListing: 3,
  // Customer's explicit ask ("sitede geçirdikleri vakit... mesaj almaları")
  // for broader engagement sources - see resolveSystemSenderId-adjacent
  // call sites for exactly where each fires and why it's spam-resistant.
  dailyVisit: 2,
  messageReceived: 2,
  socialShare: 3,
  // Yazarhane post (see yazarhane.ts) - same tier as blogPublished, both
  // being real editorial-ish content contributions.
  authorPost: 8,
} as const;

/**
 * Maintainer's explicit "spama karşı koru" ask: unlike ratings (already
 * naturally capped - the reasonKey is per-entity, `rating:book:123`, so
 * re-rating the same book never re-earns) and every other point source
 * here (each has its own natural per-entity/per-day cap baked into its
 * reasonKey), comments had NO cap at all - a real gap, since every genuinely
 * NEW comment always earns (comment:<new id>), so posting low-effort
 * comments across many different books could farm points indefinitely.
 * These are daily ceilings on how many comment/rating point-transactions
 * count, not a block on posting itself - past the cap, the action still
 * works normally, it just stops earning points for the rest of that day.
 */
export const DAILY_CAP_DEFAULTS = {
  dailyCommentCap: 10,
  dailyRatingCap: 20,
} as const;

export type PointSettingKey = keyof typeof POINT_VALUES | keyof typeof DAILY_CAP_DEFAULTS;

const ALL_SETTING_DEFAULTS: Record<PointSettingKey, number> = { ...POINT_VALUES, ...DAILY_CAP_DEFAULTS };

export type PointSettings = Record<PointSettingKey, number>;

/**
 * Admin-editable point values/caps (maintainer's explicit ask - these were
 * hardcoded constants until now). Key-value table, not one column per
 * point type, so a new point source doesn't need a schema migration - just
 * a new entry in ALL_SETTING_DEFAULTS. Missing keys (never edited by an
 * admin) silently fall back to the hardcoded default rather than needing
 * every key pre-seeded as a row.
 */
export async function getPointSettings(): Promise<PointSettings> {
  const rows = await db.select().from(pointSetting);
  const overrides = new Map(rows.map((r) => [r.settingKey, r.points]));
  const result = {} as PointSettings;
  for (const key of Object.keys(ALL_SETTING_DEFAULTS) as PointSettingKey[]) {
    result[key] = overrides.get(key) ?? ALL_SETTING_DEFAULTS[key];
  }
  return result;
}

export async function updatePointSetting(key: PointSettingKey, points: number): Promise<void> {
  if (!(key in ALL_SETTING_DEFAULTS)) throw new Error("Tanımsız puan ayarı.");
  if (!Number.isInteger(points) || points < 0) throw new Error("Puan değeri negatif olmayan bir tam sayı olmalıdır.");
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.insert(pointSetting).values({ settingKey: key, points, updatedDate: now })
    .onDuplicateKeyUpdate({ set: { points, updatedDate: now } });
}

/**
 * Activity-based milestone badges - a natural extension of the points
 * system, and a real gap PLAN.md's Phase 6 already anticipated ("Badges-by-
 * activity, replacing v1's static badge assignment"): v1's own `badges`/
 * `user_badges` tables have no write path anywhere in the real codebase at
 * all, assignment there is purely manual/one-off. These thresholds/names are
 * a fresh design, not a port.
 */
export const POINT_MILESTONES = [
  { threshold: 25, name: "Aktif Okur", nameUs: "Active Reader", comment: "25 puana ulaştı", commentUs: "Reached 25 points" },
  { threshold: 100, name: "Kitap Kurdu", nameUs: "Bookworm", comment: "100 puana ulaştı", commentUs: "Reached 100 points" },
  { threshold: 250, name: "DKList Gönüllüsü", nameUs: "DKList Devotee", comment: "250 puana ulaştı", commentUs: "Reached 250 points" },
  { threshold: 500, name: "DKList Efsanesi", nameUs: "DKList Legend", comment: "500 puana ulaştı", commentUs: "Reached 500 points" },
] as const;

/** A real Admin-type account, used as the "from the DKList team" sender for
 * system-initiated notifications - dknotifiaction.sender_user_id is a real
 * NOT NULL FK with no NULL/system-sender concept in this schema (matches
 * v1's own NotifyManager design, which always requires both parties). */
async function resolveSystemSenderId(): Promise<number | null> {
  const [admin] = await db.select({ id: user.id }).from(user).where(eq(user.userType, "Admin")).limit(1);
  return admin?.id ?? null;
}

async function findOrCreateMilestoneBadge(def: (typeof POINT_MILESTONES)[number]): Promise<number> {
  const [existing] = await db.select({ id: badges.id }).from(badges).where(eq(badges.name, def.name)).limit(1);
  if (existing) return existing.id;

  const [result] = await db.insert(badges).values({
    comment: def.comment,
    commentUs: def.commentUs,
    img: "",
    name: def.name,
    nameUs: def.nameUs,
  });
  return result.insertId;
}

/** Checks the user's current lifetime total against every milestone and
 * awards any newly-crossed one. Idempotent via `user_badges`' own composite
 * PRIMARY KEY(user_id, badges_id) - a duplicate insert just fails silently,
 * same pattern as point_transaction's UNIQUE(user_id, reason_key). */
async function checkMilestoneBadges(userId: number): Promise<void> {
  const total = await getUserTotalPoints(userId);
  const crossed = POINT_MILESTONES.filter((m) => total >= m.threshold);
  if (crossed.length === 0) return;

  let senderId: number | null | undefined;

  for (const milestone of crossed) {
    const badgeId = await findOrCreateMilestoneBadge(milestone);
    try {
      await db.insert(userBadges).values({ userId, badgesId: badgeId });
    } catch (err) {
      const message = (err as Error).message ?? "";
      if (!message.includes("PRIMARY") && !message.includes("Duplicate entry")) throw err;
      continue; // already has this badge - not a new award, no notification
    }

    // Only reached on a genuinely new badge (the insert above didn't throw).
    // Resolved lazily and only once, since most calls award zero new badges.
    if (senderId === undefined) senderId = await resolveSystemSenderId();
    if (senderId) {
      await addNotification(
        userId,
        senderId,
        `Yeni rozet kazandın: "${milestone.name}" (${milestone.comment}).`,
        `New badge earned: "${milestone.nameUs}" (${milestone.commentUs}).`,
      );
    }
  }
}

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
    return; // not a new award - no new points earned, so no milestone re-check needed
  }

  await checkMilestoneBadges(userId);
}

/**
 * Same as awardPoints(), but refuses to award once the user has already
 * earned `dailyCap` point-transactions tagged with `reason` today - the
 * spam-protection layer comment/rating points need (see DAILY_CAP_DEFAULTS'
 * doc comment for why those two specifically). The action itself (posting
 * the comment, submitting the rating) always still succeeds; this only
 * gates whether it ALSO earns points. Counts by `reason`, not `reasonKey`,
 * since reasonKey is unique per row by design (comment:<id>).
 *
 * Premium privilege (maintainer's own judgment call on the customer's
 * unscoped "özel durumlara insiyatif" ask, see PLAN.md): Premium members
 * skip the daily cap entirely. It's a real, meaningful perk for genuinely
 * active members (the cap only ever bites someone posting a lot in one
 * day) and costs nothing to grant - the spam risk the cap guards against
 * is paid-membership-gated by definition, not free-to-abuse.
 */
export async function awardPointsWithDailyCap(
  userId: number,
  points: number,
  reason: string,
  reasonKey: string,
  dailyCap: number,
): Promise<void> {
  if (await isUserPremium(userId)) {
    await awardPoints(userId, points, reason, reasonKey);
    return;
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pointTransaction)
    .where(
      and(
        eq(pointTransaction.userId, userId),
        eq(pointTransaction.reason, reason),
        sql`${pointTransaction.createdAt} >= CURDATE()`,
      ),
    );
  if (Number(row?.count ?? 0) >= dailyCap) return;

  await awardPoints(userId, points, reason, reasonKey);
}

/** Once per calendar day per user - the honest version of "rewarding time
 * on site" without needing real session/dwell-time tracking infra (which
 * would mean a client-side beacon pinging every N seconds, a much heavier
 * build for a fuzzier signal). A genuine visit while signed in is a fine,
 * simple proxy; the reasonKey's date makes this naturally idempotent, no
 * separate "already awarded today" check needed. */
export async function awardDailyVisitPoints(userId: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const settings = await getPointSettings();
  await awardPoints(userId, settings.dailyVisit, "daily_visit", `daily_visit:${userId}:${today}`);
}

/** Once per (user, entityKey, day) - not per click, so mashing the same
 * share button repeatedly doesn't farm points. `entityKey` is caller-
 * supplied (e.g. "book:123", "blog:45") and just needs to be stable per
 * shared entity, matches the reasonKey pattern every other action here
 * already uses. */
export async function awardSharePoints(userId: number, entityKey: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const settings = await getPointSettings();
  await awardPoints(userId, settings.socialShare, "social_share", `social_share:${userId}:${entityKey}:${today}`);
}

export async function getUserTotalPoints(userId: number): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${pointTransaction.points}), 0)` })
    .from(pointTransaction)
    .where(eq(pointTransaction.userId, userId));
  return Number(row?.total ?? 0);
}

// Customer's ask: "dynamic member badges/titles earned by recent activity
// level rather than static admin-assigned badges" - v1's badge system
// (BadgeController/"Rozetler") is static/manual only; this layers a
// current-status tier on top instead of a permanent achievement. Unlike the
// lifetime-point milestone badges (once earned, kept forever in
// user_badges), this is deliberately NOT stored anywhere - it's recomputed
// fresh from a trailing 30-day window every time a profile is viewed, so it
// can turn back off if activity drops, matching "recent" in the customer's
// own wording. Threshold is a judgment call (customer's notes explicitly
// leave point-system specifics to be decided): 30 points in 30 days is
// roughly "a genuine comment or two plus some ratings/likes a month", not
// an extreme bar - documented here rather than left unexplained.
const VETERAN_TIER_THRESHOLD_POINTS = 30;
const VETERAN_TIER_WINDOW_DAYS = 30;

export async function isRecentlyActive(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${pointTransaction.points}), 0)` })
    .from(pointTransaction)
    .where(
      and(
        eq(pointTransaction.userId, userId),
        sql`${pointTransaction.createdAt} >= DATE_SUB(NOW(), INTERVAL ${VETERAN_TIER_WINDOW_DAYS} DAY)`,
      ),
    );
  return Number(row?.total ?? 0) >= VETERAN_TIER_THRESHOLD_POINTS;
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

export interface UserWeeklyRank {
  points: number;
  rank: number;
  totalRanked: number;
}

/** Where a specific user stands this week, even if they're outside
 * whatever top-N slice the leaderboard page happens to be showing - lets
 * "Bu hafta #47'sin" be shown to someone who isn't in the top 10/20, which
 * the plain getWeeklyLeaderboard() list alone can't answer. */
export async function getUserWeeklyRank(userId: number, yearWeek: string = currentISOWeek()): Promise<UserWeeklyRank | null> {
  const { start, end } = getISOWeekRange(yearWeek);
  const startStr = start.toISOString().slice(0, 19).replace("T", " ");
  const endStr = end.toISOString().slice(0, 19).replace("T", " ");

  const rows = await db.execute(sql`
    SELECT user_id, points, ranked, total
    FROM (
      SELECT
        pt.user_id AS user_id,
        SUM(pt.points) AS points,
        RANK() OVER (ORDER BY SUM(pt.points) DESC) AS ranked,
        COUNT(*) OVER () AS total
      FROM point_transaction pt
      WHERE pt.created_at >= ${startStr} AND pt.created_at < ${endStr}
      GROUP BY pt.user_id
    ) ranked_totals
    WHERE user_id = ${userId}
  `);
  const result = rows[0] as unknown as { user_id: number; points: number; ranked: number; total: number }[];
  const row = result[0];
  if (!row) return null;
  return { points: Number(row.points), rank: Number(row.ranked), totalRanked: Number(row.total) };
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

  // Congratulate the winner - modeled as a message "from the DKList team".
  const senderId = await resolveSystemSenderId();
  if (senderId) {
    let bookName: string | null = null;
    if (prizeBookId) {
      const [row] = await db.select({ name: book.name }).from(book).where(eq(book.id, prizeBookId)).limit(1);
      bookName = row?.name ?? null;
    }
    const prizeText = bookName ? ` Hediyen: "${bookName}".` : "";
    await addNotification(
      userId,
      senderId,
      `Tebrikler! ${yearWeek} haftasının en aktif okuru sensin (${points} puan).${prizeText}`,
      `Congratulations! You're the top reader for week ${yearWeek} (${points} points).${prizeText}`,
    );
  }

  return { status: true };
}

export async function markWinnerFulfilled(id: number): Promise<void> {
  await db
    .update(weeklyWinner)
    .set({ fulfilled: 1, fulfilledAt: new Date().toISOString().slice(0, 19).replace("T", " ") })
    .where(eq(weeklyWinner.id, id));
}
