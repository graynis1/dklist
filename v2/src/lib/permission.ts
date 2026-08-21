import "server-only";
import { auth } from "@/auth";

/**
 * v1's UserTypeEnum. `Blog_Yazari`/`Üye` are the real stored `user_type`
 * string values (not English-friendly slugs) - kept verbatim since this has
 * to match what's actually in the `user.user_type` column.
 */
export const USER_TYPES = {
  SuperAdmin: "SuperAdmin",
  Admin: "Admin",
  Mod: "Mod",
  Blogger: "Blog_Yazari",
  Member: "Üye",
} as const;

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];

/**
 * v1's Permission::checkPermission(): `SuperAdmin` always passes regardless
 * of the allowed-list passed in; every other type must be explicitly listed.
 * This is the one place that rule lives - every caller goes through this
 * rather than re-deriving it.
 */
export function hasRole(userType: string | null | undefined, allowed: UserType[]): boolean {
  if (!userType) return false;
  if (userType === USER_TYPES.SuperAdmin) return true;
  return allowed.includes(userType as UserType);
}

/**
 * Server Action / Server Component guard - throws if the signed-in user
 * (or lack thereof) doesn't satisfy `allowed`. Real gap this closes: v1
 * checks permission at the point of the mutating action itself, but v2's
 * first admin tool (`/admin/merge`) only ever checked the *page* render
 * ("is signed in"), not the Server Action - since Server Actions are their
 * own reachable endpoint independent of how the page that references them
 * renders, that left the actual mutation completely unguarded.
 */
export async function requireRole(allowed: UserType[]): Promise<{ id: number; userType: string }> {
  const session = await auth();
  const userType = session?.user?.userType;
  if (!session?.user?.id || !hasRole(userType, allowed)) {
    throw new Error("Bu işlem için yetkiniz yetersiz.");
  }
  return { id: Number(session.user.id), userType: userType! };
}
