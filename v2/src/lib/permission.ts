import "server-only";
import { auth } from "@/auth";

/**
 * v1's UserTypeEnum (`SuperAdmin, Admin, Mod, Blog_Yazari, Üye`) plus the
 * customer's new-for-v2 role hierarchy ask, previously gated on the
 * maintainer's own decision and now explicitly authorized: `Kurucu` (founder
 * - can be more than one person, but once granted must be UN-REVOCABLE by
 * anyone, stated twice for emphasis in the customer's notes), and `Yazar`/
 * `Yayinevi` (author/publisher members who can submit book data directly -
 * addresses the "only admin can add data" bottleneck the customer flagged).
 * `Mod`'s stored value is unchanged (no data migration needed - it's a free-
 * text varchar) but its public-facing label is "Kütüphaneci" everywhere in
 * the UI per the customer's explicit ask ("kütüphaneci" reads friendlier
 * than "moderatör") - see ROLE_LABELS below for that display mapping. The
 * customer's notes mention "Kütüphaneci üye" twice with slightly different
 * framing (an author/publisher-adjacent data-entry role, and the friendlier
 * label for Moderatör) - collapsed into the one role (Mod/"Kütüphaneci") that
 * both enters AND approves data, since that's the fuller, more concrete of
 * the two descriptions and avoids inventing a fourth near-duplicate role the
 * notes never clearly distinguish.
 */
export const USER_TYPES = {
  SuperAdmin: "SuperAdmin",
  Kurucu: "Kurucu",
  Admin: "Admin",
  Mod: "Mod",
  Yazar: "Yazar",
  Yayinevi: "Yayinevi",
  Blogger: "Blog_Yazari",
  Member: "Üye",
} as const;

export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];

/** Friendlier public-facing labels - only "Mod" differs from its own stored
 * value (customer's explicit ask); every other role displays as its real
 * name. Use this anywhere a role is shown to a user, never the raw value. */
export const ROLE_LABELS: Record<UserType, string> = {
  [USER_TYPES.SuperAdmin]: "SuperAdmin",
  [USER_TYPES.Kurucu]: "Kurucu",
  [USER_TYPES.Admin]: "Yönetici",
  [USER_TYPES.Mod]: "Kütüphaneci",
  [USER_TYPES.Yazar]: "Yazar Üye",
  [USER_TYPES.Yayinevi]: "Yayınevi Üye",
  [USER_TYPES.Blogger]: "Blog Yazarı",
  [USER_TYPES.Member]: "Üye",
};

/** Roles that can submit book/writer/publisher data directly (customer's
 * "eksik kitap bildir bottleneck" fix) - Admin/Mod entries auto-approve
 * (Mod = "Kütüphaneci" can already approve others', so its own submissions
 * skip the queue too, matching v1's own `add()` logic for Admin); Yazar/
 * Yayinevi submissions land pending, same as v1's Blogger-post model. */
export const DATA_ENTRY_ROLES: UserType[] = [
  USER_TYPES.Yazar,
  USER_TYPES.Yayinevi,
  USER_TYPES.Mod,
  USER_TYPES.Admin,
];

export const AUTO_APPROVE_ROLES: UserType[] = [USER_TYPES.Admin, USER_TYPES.Mod];

/**
 * v1's Permission::checkPermission(): `SuperAdmin` always passes regardless
 * of the allowed-list passed in; every other type must be explicitly listed.
 * `Kurucu` is deliberately NOT given this same blanket pass - the customer's
 * spec only calls Kurucu "full permissions" in the sense of what an Admin
 * already has, not a SuperAdmin-equivalent escape hatch; giving it an
 * unconditional bypass here would make the un-revocable protection below
 * meaningless (anyone with Kurucu could then bypass any role-management
 * check written against `hasRole`). This is the one place the SuperAdmin
 * rule lives - every caller goes through this rather than re-deriving it.
 */
export function hasRole(userType: string | null | undefined, allowed: UserType[]): boolean {
  if (!userType) return false;
  if (userType === USER_TYPES.SuperAdmin) return true;
  return allowed.includes(userType as UserType);
}

/**
 * The customer's hard requirement, stated twice for emphasis: once granted,
 * Kurucu status must be un-revocable by any other role. This is the one
 * check every role-change action must call before touching a target user's
 * `user_type` - it has nothing to do with the ACTOR's own role, only the
 * TARGET's current one.
 */
export function isProtectedFromRoleChange(targetUserType: string | null | undefined): boolean {
  return targetUserType === USER_TYPES.Kurucu;
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
