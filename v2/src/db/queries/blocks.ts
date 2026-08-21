import "server-only";
import { and, eq, or, desc } from "drizzle-orm";
import { db } from "@/db";
import { userBlock, follow, user } from "@/db/schema";
import { isDuplicateKeyError } from "@/lib/db-errors";

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/** True if EITHER party has blocked the other - the check every messaging/
 * follow entry point needs, not just "did A block B" (a block is only
 * useful if it stops contact in both directions, regardless of who
 * initiated it). */
export async function isBlockedEitherWay(userIdA: number, userIdB: number): Promise<boolean> {
  const [row] = await db
    .select({ id: userBlock.id })
    .from(userBlock)
    .where(
      or(
        and(eq(userBlock.blockerId, userIdA), eq(userBlock.blockedId, userIdB)),
        and(eq(userBlock.blockerId, userIdB), eq(userBlock.blockedId, userIdA)),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function isBlockedByMe(blockerId: number, blockedId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: userBlock.id })
    .from(userBlock)
    .where(and(eq(userBlock.blockerId, blockerId), eq(userBlock.blockedId, blockedId)))
    .limit(1);
  return Boolean(row);
}

/**
 * Blocking also severs any existing follow relationship in both
 * directions - a block that leaves the blocked user still following (and
 * seeing activity from) the blocker isn't a real block.
 */
export async function blockUser(blockerId: number, blockedId: number): Promise<void> {
  if (blockerId === blockedId) throw new Error("Kendinizi engelleyemezsiniz.");

  try {
    await db.insert(userBlock).values({ blockerId, blockedId, createdAt: nowSql() });
  } catch (err) {
    if (isDuplicateKeyError(err, "uniq_user_block")) return; // already blocked
    throw err;
  }

  await db.delete(follow).where(
    or(
      and(eq(follow.followerId, blockerId), eq(follow.followedId, blockedId)),
      and(eq(follow.followerId, blockedId), eq(follow.followedId, blockerId)),
    ),
  );
}

export async function unblockUser(blockerId: number, blockedId: number): Promise<void> {
  await db.delete(userBlock).where(and(eq(userBlock.blockerId, blockerId), eq(userBlock.blockedId, blockedId)));
}

export interface BlockedUserItem {
  id: number;
  username: string;
  image: string | null;
  blockedAt: string;
}

export async function getBlockedUsers(blockerId: number): Promise<BlockedUserItem[]> {
  const rows = await db
    .select({ id: user.id, username: user.username, image: user.image, blockedAt: userBlock.createdAt })
    .from(userBlock)
    .innerJoin(user, eq(userBlock.blockedId, user.id))
    .where(eq(userBlock.blockerId, blockerId))
    .orderBy(desc(userBlock.id));
  return rows;
}
