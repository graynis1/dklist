import "server-only";
import { auth } from "@/auth";
import { hasRole, type UserType } from "@/lib/roles";

export {
  USER_TYPES,
  ROLE_LABELS,
  DATA_ENTRY_ROLES,
  AUTO_APPROVE_ROLES,
  hasRole,
  isProtectedFromRoleChange,
  type UserType,
} from "@/lib/roles";

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
