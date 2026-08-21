import "server-only";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { badges } from "@/db/schema";
import { POINT_MILESTONES } from "@/db/queries/points";

export interface PublicBadgeItem {
  id: number;
  name: string;
  comment: string;
  img: string | null;
  earnedByCount: number;
  /** How to earn this badge, when known - only the auto-awarded point
   * milestones have a mechanical answer; admin-defined badges are
   * whatever the admin intended, described only by their own comment. */
  milestoneThreshold: number | null;
}

/**
 * "Rozet Galerisi" - fourth item of the new round past the brainstorm
 * list: a public showcase of every badge that exists (both the point-
 * milestone badges points.ts auto-awards, and any admin-defined badge from
 * /admin/rozetler - both live in the same `badges` table), each with a
 * real earned-by count, rather than only ever seeing badges on a profile
 * that already has one.
 */
export async function getPublicBadgeGallery(): Promise<PublicBadgeItem[]> {
  const rows = await db
    .select({
      id: badges.id,
      name: badges.name,
      comment: badges.comment,
      img: badges.img,
      earnedByCount: sql<number>`(SELECT count(*) FROM user_badges ub WHERE ub.badges_id = ${badges.id})`,
    })
    .from(badges)
    .orderBy(desc(sql`(SELECT count(*) FROM user_badges ub WHERE ub.badges_id = ${badges.id})`));

  const milestoneByName = new Map<string, number>(POINT_MILESTONES.map((m) => [m.name, m.threshold]));

  return rows.map((r) => ({
    ...r,
    earnedByCount: Number(r.earnedByCount),
    img: r.img || null,
    milestoneThreshold: milestoneByName.get(r.name) ?? null,
  }));
}
