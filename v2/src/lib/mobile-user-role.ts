import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";

/** The mobile JWT carries the role from sign-in time, which goes stale the
 * moment an admin approves a Yazarhane application or changes the role -
 * permission checks read the live value instead. */
export async function getLiveUserType(userId: number): Promise<string | null> {
  const [row] = await db.select({ userType: user.userType }).from(user).where(eq(user.id, userId)).limit(1);
  return row?.userType ?? null;
}
