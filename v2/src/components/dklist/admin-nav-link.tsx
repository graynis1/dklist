import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/auth";
import { hasRole, USER_TYPES } from "@/lib/permission";

// Same Suspense-isolation reasoning as AuthStatus: auth() reads cookies(),
// keeping it out of SiteHeader directly lets the rest of the header still
// prerender into the static shell.
export function AdminNavLink() {
  return (
    <Suspense fallback={null}>
      <AdminNavLinkContent />
    </Suspense>
  );
}

async function AdminNavLinkContent() {
  const session = await auth();
  if (!session?.user || !hasRole(session.user.userType, [USER_TYPES.Mod, USER_TYPES.Admin])) {
    return null;
  }

  return (
    <Link href="/admin" className="transition-colors hover:text-foreground">
      Yönetim
    </Link>
  );
}
