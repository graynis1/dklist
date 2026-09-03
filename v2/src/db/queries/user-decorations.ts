import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { user, badges, userBadges, pointReward } from "@/db/schema";
import { frameTierFromPointCost, type FrameTier } from "@/lib/profile-frame-tier";
import { POINT_MILESTONES } from "@/db/queries/points";

/**
 * Customer's ask (2026-09-03): "Çerçeveler akış yorum tartışma mesaj vs gibi
 * heryerde gözüksün. Kişinin sahip olduğu en yüksek rozet de gözüksün" -
 * the tiered profile frame (built for the profile page only, previous
 * commits) and the person's single highest-ranked badge should both show
 * everywhere a person's avatar renders site-wide: feed, comments/replies,
 * messages, sidebars.
 *
 * `EntityAvatar` is the one shared small-avatar component already used at
 * every one of those call sites - rather than rewriting every list query's
 * SQL (each has its own shape/cache tags), this is a single batch lookup
 * called once per list AFTER the normal query, keyed by whatever user ids
 * that list already returns. Zero changes needed to any existing query.
 *
 * "Highest badge" only has a well-defined ranking for the auto-awarded
 * lifetime-point milestone badges (`POINT_MILESTONES`, real threshold
 * order 25/100/250/500) - matched back by name. Admin-manually-assigned
 * badges (the pre-existing `badges`/`user_badges` v1 tables) have no
 * inherent rank anywhere in the system, so they're deliberately excluded
 * here rather than inventing a fake ordering for them.
 */
export interface UserDecoration {
  profileFrame: string | null;
  frameTier: FrameTier;
  highestBadge: { name: string; threshold: number } | null;
}

const EMPTY: UserDecoration = { profileFrame: null, frameTier: 1, highestBadge: null };

export async function getUserDecorations(userIds: number[]): Promise<Map<number, UserDecoration>> {
  const ids = [...new Set(userIds)].filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return new Map();

  const [frameRows, badgeRows] = await Promise.all([
    db.select({ id: user.id, profileFrame: user.profileFrame }).from(user).where(inArray(user.id, ids)),
    db
      .select({ userId: userBadges.userId, name: badges.name })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgesId, badges.id))
      .where(inArray(userBadges.userId, ids)),
  ]);

  const colors = [...new Set(frameRows.map((r) => r.profileFrame).filter((c): c is string => Boolean(c)))];
  const costRows = colors.length
    ? await db
        .select({ rewardValue: pointReward.rewardValue, pointCost: pointReward.pointCost })
        .from(pointReward)
        .where(and(inArray(pointReward.rewardValue, colors), eq(pointReward.rewardType, "profile_frame")))
    : [];
  const costByColor = new Map(costRows.map((r) => [r.rewardValue, r.pointCost]));

  const milestoneByName = new Map<string, { name: string; threshold: number }>(POINT_MILESTONES.map((m) => [m.name, m]));
  const highestBadgeByUser = new Map<number, { name: string; threshold: number }>();
  for (const row of badgeRows) {
    const milestone = milestoneByName.get(row.name);
    if (!milestone) continue;
    const current = highestBadgeByUser.get(row.userId);
    if (!current || milestone.threshold > current.threshold) {
      highestBadgeByUser.set(row.userId, { name: milestone.name, threshold: milestone.threshold });
    }
  }

  const result = new Map<number, UserDecoration>();
  for (const row of frameRows) {
    const pointCost = row.profileFrame ? (costByColor.get(row.profileFrame) ?? null) : null;
    result.set(row.id, {
      profileFrame: row.profileFrame,
      frameTier: frameTierFromPointCost(pointCost),
      highestBadge: highestBadgeByUser.get(row.id) ?? null,
    });
  }
  return result;
}

export function decorationFor(map: Map<number, UserDecoration>, userId: number): UserDecoration {
  return map.get(userId) ?? EMPTY;
}
